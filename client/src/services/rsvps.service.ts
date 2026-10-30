import {
  type BookingBlockCode,
  bookingCancelInput,
  bookingChangeRequestInput,
  bookingCreateInput,
  bookingMoveInput,
  changeRequestDecisionInput,
} from '@shared/schemas/booking-rsvp'
import { z } from 'zod'
import {
  ApiError,
  commit,
  db,
  delay,
  insertRow,
  now,
  nowIso,
  out,
  parseInput,
  requireRole,
  updateRow,
  type Viewer,
} from './api'
import { recordAudit } from './audit.service'
import { demoSettings } from './demo-settings.service'
import { changeRequestMessage } from './notifications/copy'
import { notify } from './notifications.service'
import {
  applyChangeRequestDecision,
  CHANGE_REQUESTED,
  changeRequestRows,
} from './rsvps/change-requests'
import { evaluate, loadLearnerContext, withinSelfService } from './rsvps/eligibility'
import { closeOpenOffer, offerFreedSeats, settleOffers } from './rsvps/offers'
import { nextWaitlistPosition, renumberWaitlist } from './rsvps/waitlist'
import {
  getSessionCard,
  isActiveRsvp,
  ms,
  selectSessionCards,
  syncCapacityStatus,
} from './sessions/store'
import { toSessionView } from './sessions/view'

/**
 * The learner booking experience (brief §6, formerly the /api/rsvps module): catalogue with
 * eligibility, booking with capacity and waitlist, self-service cancel and move until 24 hours
 * before the session, and a change request for admin review after that. Booking is a learner
 * action on their own records only. Late change request review (admin) lives here too.
 */

const refuse = (code: BookingBlockCode, message: string) => ApiError.conflict(code, message)

const ADMIN_REVIEW_MESSAGE =
  'Changes inside 24 hours of the session need admin review. Send a request and the Academy will follow up.'

const idInput = z.uuid()

/** Learner catalogue (brief §6): upcoming sessions in the learner's programmes, with eligibility. */
export async function getCatalogue() {
  await delay()
  const learner = requireRole('learner')
  if (settleOffers()) commit()
  const at = now()
  const ctx = loadLearnerContext(learner.id)
  const enrolled = ctx.programmes
  const programmeIds = new Set(db.programmes.filter((p) => enrolled.has(p.code)).map((p) => p.id))
  const cards =
    enrolled.size === 0
      ? []
      : selectSessionCards(
          (s) =>
            (s.status === 'published' || s.status === 'full') &&
            ms(s.startsAt) > at.getTime() &&
            programmeIds.has(s.programmeId),
        )
  const programmes = db.programmes
    .filter((p) => enrolled.has(p.code))
    .map((p) => ({ code: p.code, title: p.title }))
  return out({
    now: at.toISOString(),
    programmes,
    level1: ctx.level1,
    /** Seat-offer acceptance window (demo setting), for the "session full" note. */
    offerWindowHours: demoSettings().seatOfferWindowHours,
    items: cards.map((card) => ({ ...toSessionView(card), eligibility: evaluate(card, ctx, at) })),
  })
}

/** My sessions: every booking the learner made, with outcome and reschedule history. */
export async function getMySessions() {
  await delay()
  const learner = requireRole('learner')
  if (settleOffers()) commit()
  const at = now()
  const rows = db.rsvps
    .filter((r) => r.learnerId === learner.id)
    .sort((a, b) => ms(b.bookedAt) - ms(a.bookedAt))
  if (rows.length === 0) return out({ now: at.toISOString(), items: [] })

  const sessionIds = new Set(rows.map((r) => r.sessionId))
  const cards = new Map(
    selectSessionCards((s) => sessionIds.has(s.id)).map((card) => [card.session.id, card]),
  )
  const reschedules = db.sessionReschedules
    .filter((r) => sessionIds.has(r.sessionId))
    .sort((a, b) => ms(b.createdAt) - ms(a.createdAt))
  const attendance = new Map(db.attendance.map((a) => [a.rsvpId, a.status]))
  const scores = new Map(db.sessionScores.map((s) => [s.rsvpId, s]))
  const offers = new Map(
    db.seatOffers.filter((o) => o.status === 'offered').map((o) => [o.rsvpId, o]),
  )

  const items = rows.flatMap((rsvp) => {
    const card = cards.get(rsvp.sessionId)
    if (!card) return []
    const lastMove = reschedules.find(
      (r) => r.sessionId === rsvp.sessionId && ms(r.createdAt) > ms(rsvp.bookedAt),
    )
    const score = scores.get(rsvp.id)
    const isFinal = score?.status === 'final'
    return [
      {
        rsvpId: rsvp.id,
        status: rsvp.status,
        waitlistPosition: rsvp.waitlistPosition,
        /** The open seat offer (status 'offered'): when it was made and when it lapses. */
        offer: offers.has(rsvp.id)
          ? {
              offerId: offers.get(rsvp.id)?.id ?? '',
              offeredAt: offers.get(rsvp.id)?.offeredAt ?? '',
              expiresAt: offers.get(rsvp.id)?.expiresAt ?? '',
            }
          : null,
        bookedAt: new Date(rsvp.bookedAt).toISOString(),
        cancelledReason: rsvp.cancelledReason,
        replacedByRsvpId: rsvp.replacedByRsvpId,
        attendance: attendance.get(rsvp.id) ?? null,
        // Learners see a score only once the trainer has finalised it.
        score: isFinal ? (score?.total ?? null) : null,
        feedback: isFinal ? (score?.feedback ?? null) : null,
        selfServiceOpen: withinSelfService(card.session.startsAt, at),
        rescheduled: lastMove
          ? {
              previousStartsAt: new Date(lastMove.previousStartsAt).toISOString(),
              reason: lastMove.reason,
              at: new Date(lastMove.createdAt).toISOString(),
            }
          : null,
        session: toSessionView(card),
      },
    ]
  })
  return out({ now: at.toISOString(), items })
}

/** Confirms a seat, or joins the waitlist when the learner asks for it on a full session. */
export async function bookSession(input: z.input<typeof bookingCreateInput>) {
  await delay()
  const learner = requireRole('learner')
  const body = parseInput(bookingCreateInput, input)
  settleOffers()
  const card = getSessionCard(body.sessionId)
  const verdict = evaluate(card, loadLearnerContext(learner.id), now())
  if (verdict.state === 'booked') {
    throw refuse('ALREADY_BOOKED', 'You already have a booking for this session.')
  }
  if (verdict.state === 'locked') throw refuse(verdict.code, verdict.reason)
  if (verdict.state === 'waitlist' && !body.joinWaitlist) {
    throw refuse('SESSION_FULL', 'This session is full. You can join the waitlist.')
  }

  const waitlisted = verdict.state === 'waitlist'
  const position = waitlisted ? nextWaitlistPosition(body.sessionId) : null
  const created = insertRow('rsvps', {
    sessionId: body.sessionId,
    learnerId: learner.id,
    status: waitlisted ? 'waitlisted' : 'confirmed',
    waitlistPosition: position,
    bookedAt: nowIso(),
  })
  syncCapacityStatus(body.sessionId)
  recordAudit(learner, {
    action: waitlisted ? 'rsvp.waitlist' : 'rsvp.create',
    objectType: 'rsvp',
    objectId: created.id,
    after: { sessionCode: card.session.code, status: created.status, position },
  })
  commit()
  return { rsvpId: created.id, status: created.status, waitlistPosition: created.waitlistPosition }
}

/**
 * A booking has left its session: a freed (or offered-and-returned) seat is offered to the next
 * eligible approved learner on the waitlist instead of being promoted at once; a leaver from the
 * queue only renumbers it.
 */
export function releaseSeat(
  rsvpId: string,
  sessionId: string,
  previous: string,
  actorId: string,
): number {
  if (previous === 'confirmed' || previous === 'offered') {
    closeOpenOffer(rsvpId, 'declined')
    return offerFreedSeats(sessionId, actorId).length
  }
  renumberWaitlist(sessionId)
  return 0
}

const notActive = () => ApiError.conflict('NOT_ACTIVE', 'This booking is no longer active.')

function ownActiveRsvp(learner: Viewer, rsvpId: string) {
  parseInput(idInput, rsvpId, 'param')
  const rsvp = db.rsvps.find((r) => r.id === rsvpId && r.learnerId === learner.id)
  const session = rsvp ? db.sessions.find((s) => s.id === rsvp.sessionId) : undefined
  // Someone else's booking answers exactly like a missing one, so IDs cannot be probed.
  if (!rsvp || !session) throw ApiError.notFound('Booking not found')
  if (!isActiveRsvp(rsvp)) throw notActive()
  return { rsvp, session }
}

/** Learner cancels their own booking. Inside 24 hours it must go to admin review instead. */
export async function cancelBooking(
  rsvpId: string,
  input: z.input<typeof bookingCancelInput> = {},
) {
  await delay()
  const learner = requireRole('learner')
  const { reason } = parseInput(bookingCancelInput, input)
  if (settleOffers()) commit()
  const { rsvp, session } = ownActiveRsvp(learner, rsvpId)
  // Leaving the waitlist (or turning down an offer) is always allowed; only a confirmed seat has the 24-hour rule.
  if (rsvp.status === 'confirmed' && !withinSelfService(session.startsAt, now())) {
    throw refuse('ADMIN_REVIEW_REQUIRED', ADMIN_REVIEW_MESSAGE)
  }
  const previous = rsvp.status
  updateRow(rsvp, {
    status: 'cancelled',
    waitlistPosition: null,
    cancelledReason: reason || 'Cancelled by the learner',
  })
  const offersCreated = releaseSeat(rsvp.id, rsvp.sessionId, previous, learner.id)
  syncCapacityStatus(rsvp.sessionId)
  recordAudit(learner, {
    action: 'rsvp.cancel',
    objectType: 'rsvp',
    objectId: rsvpId,
    before: { status: previous, sessionCode: session.code },
    after: { status: 'cancelled' },
    reason: reason ?? null,
  })
  commit()
  return { rsvpId, status: 'cancelled' as const, offersCreated }
}

/**
 * Learner reschedule (brief §6): the target passes the same eligibility and capacity checks, the
 * replacement seat is confirmed first, and only then is the original released.
 */
export async function moveBooking(input: z.input<typeof bookingMoveInput>) {
  await delay()
  const learner = requireRole('learner')
  const body = parseInput(bookingMoveInput, input)
  if (settleOffers()) commit()
  const { rsvp, session } = ownActiveRsvp(learner, body.rsvpId)
  if (rsvp.sessionId === body.toSessionId) {
    throw refuse('ALREADY_BOOKED', 'You are already booked on this session.')
  }
  if (!withinSelfService(session.startsAt, now())) {
    throw refuse('ADMIN_REVIEW_REQUIRED', ADMIN_REVIEW_MESSAGE)
  }
  const target = getSessionCard(body.toSessionId)
  const verdict = evaluate(target, loadLearnerContext(learner.id), now(), rsvp.id)
  if (verdict.state === 'booked') {
    throw refuse('ALREADY_BOOKED', 'You already have a booking for that session.')
  }
  if (verdict.state === 'locked') throw refuse(verdict.code, verdict.reason)
  if (verdict.state === 'waitlist') {
    throw refuse(
      'SESSION_FULL',
      'That session is full, so your current seat has been kept. You can join its waitlist separately.',
    )
  }

  const replacement = insertRow('rsvps', {
    sessionId: body.toSessionId,
    learnerId: learner.id,
    status: 'confirmed',
    waitlistPosition: null,
    bookedAt: nowIso(),
  })
  // The replacement is confirmed: now release the original seat.
  const previous = rsvp.status
  updateRow(rsvp, {
    status: 'moved',
    waitlistPosition: null,
    replacedByRsvpId: replacement.id,
    cancelledReason: 'Moved to another session by the learner',
  })
  releaseSeat(rsvp.id, rsvp.sessionId, previous, learner.id)
  syncCapacityStatus(rsvp.sessionId)
  syncCapacityStatus(body.toSessionId)
  recordAudit(learner, {
    action: 'rsvp.reschedule',
    objectType: 'rsvp',
    objectId: rsvp.id,
    before: { sessionCode: session.code, status: previous },
    after: { sessionCode: target.session.code, rsvpId: replacement.id },
  })
  commit()
  return { rsvpId: replacement.id, previousRsvpId: rsvp.id, status: replacement.status }
}

/**
 * Inside 24 hours a learner cannot change the booking themselves: the request is logged for
 * admin review and the admins get an in-app message. One request per booking.
 */
export async function requestBookingChange(
  rsvpId: string,
  input: z.input<typeof bookingChangeRequestInput>,
) {
  await delay()
  const learner = requireRole('learner')
  const body = parseInput(bookingChangeRequestInput, input)
  const { rsvp, session } = ownActiveRsvp(learner, rsvpId)
  if (withinSelfService(session.startsAt, now())) {
    throw ApiError.conflict(
      'SELF_SERVICE_OPEN',
      'You can still change this booking yourself in My sessions.',
    )
  }
  const existing = db.auditEvents.some(
    (e) => e.action === CHANGE_REQUESTED && e.objectId === rsvpId,
  )
  if (existing) return { requested: true, alreadyRequested: true }

  const learnerCode = db.profiles.find((p) => p.userId === learner.id)?.learnerCode
  const admins = db.users.filter((u) => u.role === 'admin').map((u) => u.id)
  recordAudit(learner, {
    action: CHANGE_REQUESTED,
    objectType: 'rsvp',
    objectId: rsvpId,
    after: { sessionId: rsvp.sessionId, sessionCode: session.code, kind: body.kind },
    reason: body.reason,
  })
  notify({
    eventId: `evt-change-request-${rsvpId}`,
    kind: 'booking_change_request',
    recipientIds: admins,
    ...changeRequestMessage(
      learnerCode ?? 'Learner',
      session.title,
      new Date(session.startsAt),
      body.kind,
      body.reason,
    ),
    actorId: learner.id,
  })
  commit()
  return { requested: true, alreadyRequested: false }
}

/** Admin: late change requests (brief §6), newest first. For the admin sessions screens. */
export async function listChangeRequests() {
  await delay()
  requireRole('admin')
  return out({ items: changeRequestRows() })
}

/** Admin: approve or decline a late change request. Approving releases the seat. */
export async function decideChangeRequest(
  rsvpId: string,
  input: z.input<typeof changeRequestDecisionInput>,
) {
  await delay()
  const admin = requireRole('admin')
  parseInput(idInput, rsvpId, 'param')
  const body = parseInput(changeRequestDecisionInput, input)
  const result = applyChangeRequestDecision(admin, rsvpId, body)
  commit()
  return out(result)
}
