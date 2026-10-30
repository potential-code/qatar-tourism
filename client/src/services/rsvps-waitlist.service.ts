import { adminReasonInput } from '@shared/schemas/admin-users'
import { learnerDisplayId } from '@shared/utils/identity'
import { z } from 'zod'
import { ApiError, commit, db, delay, now, out, parseInput, requireRole, updateRow } from './api'
import { recordAudit } from './audit.service'
import { acceptOffer, declineOffer, settleOffers } from './rsvps/offers'
import { renumberWaitlist, waitlistQueue } from './rsvps/waitlist'
import { findSession, ms, syncCapacityStatus } from './sessions/store'

/**
 * Waitlist and seat-offer actions (SPEC §5) that sit beside the booking service: the learner's
 * answer to an offer, leaving the waitlist, and the administrator's priority override and
 * waitlist overview. Every action first settles lapsed offers against the demo clock.
 */

const idInput = z.uuid()

export const OFFER_EXPIRED_MESSAGE =
  'This seat offer has expired and the seat has gone to the next learner. You can join the waitlist again.'

/** Learner accepts or declines the seat offered to them. */
export async function respondToOffer(rsvpId: string, decision: 'accept' | 'decline') {
  await delay()
  const learner = requireRole('learner')
  parseInput(idInput, rsvpId, 'param')
  settleOffers()
  const rsvp = db.rsvps.find((r) => r.id === rsvpId && r.learnerId === learner.id)
  if (!rsvp) throw ApiError.notFound('Booking not found')
  const session = db.sessions.find((s) => s.id === rsvp.sessionId)
  if (!session) throw ApiError.notFound('Session not found')
  if (rsvp.status !== 'offered') {
    commit()
    throw ApiError.conflict('OFFER_NOT_OPEN', OFFER_EXPIRED_MESSAGE)
  }
  const done =
    decision === 'accept'
      ? acceptOffer(learner, rsvp, session)
      : declineOffer(learner, rsvp, session)
  if (!done) throw ApiError.conflict('OFFER_NOT_OPEN', OFFER_EXPIRED_MESSAGE)
  commit()
  return { rsvpId, status: decision === 'accept' ? ('confirmed' as const) : ('cancelled' as const) }
}

/** Learner leaves the waitlist. Always allowed, whatever the time to the session. */
export async function leaveWaitlist(rsvpId: string) {
  await delay()
  const learner = requireRole('learner')
  parseInput(idInput, rsvpId, 'param')
  settleOffers()
  const rsvp = db.rsvps.find((r) => r.id === rsvpId && r.learnerId === learner.id)
  const session = rsvp ? db.sessions.find((s) => s.id === rsvp.sessionId) : undefined
  if (!rsvp || !session) throw ApiError.notFound('Booking not found')
  if (rsvp.status !== 'waitlisted') {
    throw ApiError.conflict('NOT_WAITLISTED', 'You are not on the waitlist for this session.')
  }
  const position = rsvp.waitlistPosition
  updateRow(rsvp, {
    status: 'cancelled',
    waitlistPosition: null,
    cancelledReason: 'Left the waitlist',
  })
  renumberWaitlist(session.id)
  recordAudit(learner, {
    action: 'rsvp.leave_waitlist',
    objectType: 'rsvp',
    objectId: rsvp.id,
    before: { status: 'waitlisted', position, sessionCode: session.code },
    after: { status: 'cancelled' },
  })
  commit()
  return { rsvpId, status: 'cancelled' as const }
}

const moveInput = z.object({ direction: z.enum(['up', 'down']) })

/**
 * Administrator override of waitlist priority: moves one learner a place up or down, with a
 * mandatory reason, audited with the old and new position. Trainers cannot (403).
 */
export async function moveWaitlistEntry(
  rsvpId: string,
  input: { direction: 'up' | 'down'; reason: string },
) {
  await delay()
  const admin = requireRole('admin')
  parseInput(idInput, rsvpId, 'param')
  const { direction } = parseInput(moveInput, { direction: input.direction })
  const { reason } = parseInput(adminReasonInput, { reason: input.reason })
  settleOffers()
  const rsvp = db.rsvps.find((r) => r.id === rsvpId)
  if (rsvp?.status !== 'waitlisted') {
    throw ApiError.conflict('NOT_WAITLISTED', 'Only waitlisted learners can be re-ordered.')
  }
  const queue = waitlistQueue(rsvp.sessionId)
  const from = queue.findIndex((r) => r.id === rsvp.id)
  const to = direction === 'up' ? from - 1 : from + 1
  const neighbour = queue[to]
  if (!neighbour) {
    throw ApiError.conflict(
      'AT_EDGE',
      direction === 'up' ? 'Already first in the queue.' : 'Already last in the queue.',
    )
  }
  const mine = from + 1
  const theirs = to + 1
  updateRow(rsvp, { waitlistPosition: theirs })
  updateRow(neighbour, { waitlistPosition: mine })
  renumberWaitlist(rsvp.sessionId)
  const session = findSession(rsvp.sessionId)
  recordAudit(admin, {
    action: 'waitlist.override_priority',
    objectType: 'rsvp',
    objectId: rsvp.id,
    before: { position: mine, sessionCode: session.code },
    after: { position: theirs, swappedWith: neighbour.id },
    reason,
  })
  syncCapacityStatus(rsvp.sessionId)
  commit()
  return { rsvpId, position: theirs }
}

/** Waitlisted and offered entries on sessions that are still to come (admin list for the dashboard count). */
export function waitlistEntries() {
  const at = now().getTime()
  const sessions = new Map(db.sessions.map((s) => [s.id, s]))
  const profiles = new Map(db.profiles.map((p) => [p.userId, p]))
  const offers = new Map(
    db.seatOffers.filter((o) => o.status === 'offered').map((o) => [o.rsvpId, o]),
  )
  return db.rsvps
    .filter((r) => r.status === 'waitlisted' || r.status === 'offered')
    .flatMap((r) => {
      const session = sessions.get(r.sessionId)
      const profile = profiles.get(r.learnerId)
      if (!session || !profile) return []
      if (!['published', 'full'].includes(session.status) || ms(session.startsAt) <= at) return []
      return [
        {
          rsvpId: r.id,
          sessionId: session.id,
          sessionCode: session.code,
          sessionTitle: session.title,
          startsAt: session.startsAt,
          learnerId: r.learnerId,
          learnerDisplayId: learnerDisplayId(profile.learnerCode),
          name: profile.fullName,
          status: r.status as 'waitlisted' | 'offered',
          position: r.waitlistPosition,
          offerExpiresAt: offers.get(r.id)?.expiresAt ?? null,
        },
      ]
    })
    .sort(
      (a, b) =>
        a.startsAt.localeCompare(b.startsAt) ||
        (a.position ?? 0) - (b.position ?? 0) ||
        a.learnerDisplayId.localeCompare(b.learnerDisplayId),
    )
}

/** Admin: every waitlisted learner (with offers) for the filtered Waitlisted list. */
export async function listWaitlist() {
  await delay()
  requireRole('admin')
  if (settleOffers()) commit()
  const items = waitlistEntries()
  return out({ items, learners: new Set(items.map((i) => i.learnerId)).size })
}

export type WaitlistEntry = Awaited<ReturnType<typeof listWaitlist>>['items'][number]
