import type { ProgrammeCode } from '@shared/constants'
import type { RsvpRow, SeatOfferRow, SessionRow } from '@shared/types/db'
import { accountStatusOf } from '@shared/utils/identity'
import { db, formatQatarDateTime, insertRow, now, nowIso, updateRow, type Viewer } from '../api'
import { recordAudit } from '../audit.service'
import { demoSettings } from '../demo-settings.service'
import { notify } from '../notifications.service'
import { countActive, ms, syncCapacityStatus } from '../sessions/store'
import { loadLearnerContext, PREREQUISITE_LEVEL1 } from './eligibility'
import { renumberWaitlist, waitlistQueue } from './waitlist'

/**
 * Seat offers (SPEC §5). A freed seat is not given away: it is offered to the first ELIGIBLE,
 * APPROVED learner on the waitlist for the demo acceptance window (`seatOfferWindowHours`, 24 h
 * by default). While offered the RSVP has status 'offered' and the seat counts as occupied, so
 * nobody else can book it. Accepting confirms the learner; declining or letting the offer expire
 * passes it to the next eligible learner. Expiry is evaluated lazily against the demo clock
 * (`now()`), whenever a service reads or acts, by `settleOffers`.
 *
 * Synchronous helpers; the calling service commits.
 */

export const OFFER_DECLINED_REASON = 'Declined the seat offer'
export const OFFER_EXPIRED_REASON = 'The seat offer expired'

const HOUR_MS = 3_600_000

const offerMessage = (firstName: string, sessionTitle: string, start: Date, expires: Date) => ({
  subject: `A seat is available: ${sessionTitle}`,
  body: `Hello ${firstName}, a seat has opened on ${sessionTitle} on ${formatQatarDateTime(start)}. It is reserved for you until ${formatQatarDateTime(expires)} Qatar time. Open My sessions to accept or decline. This is a demonstration message.`,
})

const offerAcceptedMessage = (firstName: string, sessionTitle: string, start: Date) => ({
  subject: `Your seat is confirmed: ${sessionTitle}`,
  body: `Hello ${firstName}, you accepted the seat offer. Your booking for ${sessionTitle} on ${formatQatarDateTime(start)} is now confirmed.`,
})

const offerExpiredMessage = (firstName: string, sessionTitle: string) => ({
  subject: `Your seat offer expired: ${sessionTitle}`,
  body: `Hello ${firstName}, the seat offered to you on ${sessionTitle} was not accepted in time and has gone to the next learner. You can join the waitlist again if the session is still full.`,
})

const firstNameOfUser = (userId: string) =>
  (db.profiles.find((p) => p.userId === userId)?.fullName ?? 'there').trim().split(/\s+/)[0] ??
  'there'

/** A programme enrolment passes unless the learner's newest request for it is undecided or rejected. */
export function isApprovedFor(learnerId: string, programmeId: string): boolean {
  const newest = db.approvalRequests
    .filter(
      (r) => r.type === 'enrolment' && r.learnerId === learnerId && r.programmeId === programmeId,
    )
    .sort((a, b) => ms(b.submittedAt) - ms(a.submittedAt))[0]
  return !newest || newest.status === 'approved'
}

/** Why a waitlisted learner may not be offered a seat right now, or null when eligible. */
export function offerBlocker(row: RsvpRow, session: SessionRow): string | null {
  const profile = db.profiles.find((p) => p.userId === row.learnerId)
  if (!profile) return 'No learner profile'
  if (accountStatusOf(profile) !== 'active') return 'Account is not active'
  if (!isApprovedFor(row.learnerId, session.programmeId)) return 'Enrolment is not approved'
  const programme = db.programmes.find((p) => p.id === session.programmeId)
  const ctx = loadLearnerContext(row.learnerId)
  if (!programme || !ctx.programmes.has(programme.code as ProgrammeCode)) return 'Not enrolled'
  if (session.prerequisite === PREREQUISITE_LEVEL1 && !ctx.level1.complete) {
    return 'Prerequisite not met'
  }
  const start = ms(session.startsAt)
  const end = ms(session.endsAt)
  const clash = ctx.active.some(
    (b) =>
      b.rsvpId !== row.id &&
      (b.status === 'confirmed' || b.status === 'offered') &&
      b.startsAt < end &&
      b.endsAt > start,
  )
  return clash ? 'Time conflict with another booking' : null
}

/** Creates the offer for one waitlisted RSVP and tells the learner (event id = the offer). */
function createOffer(row: RsvpRow, session: SessionRow, actorId: string | null) {
  const at = now()
  const expires = new Date(at.getTime() + demoSettings().seatOfferWindowHours * HOUR_MS)
  updateRow(row, { status: 'offered', waitlistPosition: null })
  const offer = insertRow('seatOffers', {
    sessionId: session.id,
    rsvpId: row.id,
    learnerId: row.learnerId,
    offeredAt: at.toISOString(),
    expiresAt: expires.toISOString(),
    status: 'offered',
    resolvedAt: null,
  })
  notify({
    eventId: `evt-seat-offer-${offer.id}`,
    kind: 'seat_offer',
    recipientIds: [row.learnerId],
    ...offerMessage(
      firstNameOfUser(row.learnerId),
      session.title,
      new Date(session.startsAt),
      expires,
    ),
    sessionId: session.id,
    actorId,
  })
  recordAudit(null, {
    action: 'seat_offer.create',
    objectType: 'seat_offer',
    objectId: offer.id,
    after: { sessionCode: session.code, learnerId: row.learnerId, expiresAt: offer.expiresAt },
  })
  return offer
}

/**
 * Offers every free, unreserved seat to the first eligible waitlisted learners in queue order.
 * Ineligible learners are skipped and keep their place. Returns the offers created.
 */
export function offerFreedSeats(sessionId: string, actorId: string | null): SeatOfferRow[] {
  const session = db.sessions.find((s) => s.id === sessionId)
  if (!session || !['published', 'full'].includes(session.status)) return []
  if (ms(session.startsAt) <= now().getTime()) return []
  const created: SeatOfferRow[] = []
  const { confirmed, offered } = countActive(sessionId)
  let free = session.capacity - confirmed - offered
  for (const row of waitlistQueue(sessionId)) {
    if (free <= 0) break
    if (offerBlocker(row, session)) continue
    created.push(createOffer(row, session, actorId))
    free -= 1
  }
  renumberWaitlist(sessionId)
  syncCapacityStatus(sessionId)
  return created
}

/** Closes the RSVP's open offer (when it has one) with the given outcome. */
export function closeOpenOffer(
  rsvpId: string,
  status: 'accepted' | 'declined' | 'expired',
): SeatOfferRow | null {
  const offer = db.seatOffers.find((o) => o.rsvpId === rsvpId && o.status === 'offered')
  if (!offer) return null
  updateRow(offer, { status, resolvedAt: nowIso() })
  return offer
}

/**
 * Expires every offer past its deadline and offers the seat on. Also closes offers whose RSVP
 * was cancelled by another route (for example the session was cancelled). Returns true when it
 * changed anything, so the caller knows to commit. Call at the start of reads and actions.
 */
export function settleOffers(): boolean {
  const at = now().getTime()
  let changed = false
  for (const offer of db.seatOffers.filter((o) => o.status === 'offered')) {
    const rsvp = db.rsvps.find((r) => r.id === offer.rsvpId)
    if (rsvp?.status !== 'offered') {
      updateRow(offer, { status: 'expired', resolvedAt: nowIso() })
      changed = true
      continue
    }
    if (ms(offer.expiresAt) > at) continue
    const session = db.sessions.find((s) => s.id === offer.sessionId)
    updateRow(offer, { status: 'expired', resolvedAt: nowIso() })
    updateRow(rsvp, {
      status: 'cancelled',
      waitlistPosition: null,
      cancelledReason: OFFER_EXPIRED_REASON,
    })
    recordAudit(null, {
      action: 'seat_offer.expire',
      objectType: 'seat_offer',
      objectId: offer.id,
      before: { status: 'offered' },
      after: { status: 'expired' },
      reason: OFFER_EXPIRED_REASON,
    })
    if (session) {
      notify({
        eventId: `evt-seat-offer-expired-${offer.id}`,
        kind: 'seat_offer_expired',
        recipientIds: [offer.learnerId],
        ...offerExpiredMessage(firstNameOfUser(offer.learnerId), session.title),
        sessionId: session.id,
      })
      offerFreedSeats(session.id, null)
    }
    changed = true
  }
  return changed
}

/** Learner accepts: the reserved seat becomes a confirmed booking. Null when no offer is open. */
export function acceptOffer(actor: Viewer, rsvp: RsvpRow, session: SessionRow) {
  const offer = closeOpenOffer(rsvp.id, 'accepted')
  if (!offer) return null
  updateRow(rsvp, { status: 'confirmed', waitlistPosition: null })
  renumberWaitlist(session.id)
  syncCapacityStatus(session.id)
  recordAudit(actor, {
    action: 'seat_offer.accept',
    objectType: 'seat_offer',
    objectId: offer.id,
    before: { status: 'offered' },
    after: { status: 'accepted', sessionCode: session.code },
  })
  notify({
    eventId: `evt-seat-offer-accepted-${offer.id}`,
    kind: 'seat_offer_accepted',
    recipientIds: [rsvp.learnerId],
    ...offerAcceptedMessage(
      firstNameOfUser(rsvp.learnerId),
      session.title,
      new Date(session.startsAt),
    ),
    sessionId: session.id,
    actorId: actor.id,
  })
  return offer
}

/** Learner declines: leaves the queue and the seat passes to the next eligible learner. */
export function declineOffer(actor: Viewer, rsvp: RsvpRow, session: SessionRow) {
  const offer = closeOpenOffer(rsvp.id, 'declined')
  if (!offer) return null
  updateRow(rsvp, {
    status: 'cancelled',
    waitlistPosition: null,
    cancelledReason: OFFER_DECLINED_REASON,
  })
  recordAudit(actor, {
    action: 'seat_offer.decline',
    objectType: 'seat_offer',
    objectId: offer.id,
    before: { status: 'offered' },
    after: { status: 'declined', sessionCode: session.code },
  })
  offerFreedSeats(session.id, actor.id)
  return offer
}
