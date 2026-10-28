import { db } from '@server/db/connection'
import {
  attendance,
  auditEvents,
  profiles,
  programmes,
  rsvps,
  sessionReschedules,
  sessionScores,
  sessions,
  user,
} from '@server/db/schema'
import { now } from '@server/lib/clock'
import { HttpError } from '@server/lib/errors'
import type {
  BookingBlockCode,
  BookingChangeRequestInput,
  BookingCreateInput,
  BookingMoveInput,
} from '@shared/schemas/booking-rsvp'
import { and, desc, eq, gt, inArray } from 'drizzle-orm'
import { recordAudit } from '../audit/audit.service'
import { changeRequestMessage } from '../notifications/notification-copy'
import { notify } from '../notifications/notifications.service'
import type { Actor } from '../sessions/actor'
import {
  ACTIVE_RSVP,
  countActive,
  currentRsvpStatus,
  getSessionCard,
  lockLearnerBookings,
  lockSession,
  selectSessionCards,
  syncCapacityStatus,
} from '../sessions/session-store'
import { toSessionView } from '../sessions/session-view'
import { evaluate, loadLearnerContext, withinSelfService } from './eligibility'
import { nextWaitlistPosition, promoteFromWaitlist, renumberWaitlist } from './waitlist'

const refuse = (code: BookingBlockCode, message: string) => new HttpError(409, code, message)

const ADMIN_REVIEW_MESSAGE =
  'Changes inside 24 hours of the session need admin review. Send a request and the Academy will follow up.'

/** Learner catalogue (brief §6): upcoming sessions in the learner's programmes, with eligibility. */
export async function catalogue(userId: string) {
  const at = now()
  const ctx = await loadLearnerContext(db, userId)
  const enrolled = [...ctx.programmes]
  const cards =
    enrolled.length === 0
      ? []
      : await selectSessionCards(
          and(
            inArray(sessions.status, ['published', 'full']),
            gt(sessions.startsAt, at),
            inArray(programmes.code, enrolled),
          ),
        )
  const programmeRows = await db
    .select({ code: programmes.code, title: programmes.title })
    .from(programmes)
    .where(enrolled.length ? inArray(programmes.code, enrolled) : eq(programmes.code, 'A'))
  return {
    now: at.toISOString(),
    programmes: enrolled.length ? programmeRows : [],
    level1: ctx.level1,
    items: cards.map((card) => ({ ...toSessionView(card), eligibility: evaluate(card, ctx, at) })),
  }
}

/** My sessions: every booking the learner made, with outcome and reschedule history. */
export async function mySessions(userId: string) {
  const at = now()
  const rows = await db
    .select({
      rsvp: rsvps,
      attendance: attendance.status,
      scoreTotal: sessionScores.total,
      scoreStatus: sessionScores.status,
      feedback: sessionScores.feedback,
    })
    .from(rsvps)
    .leftJoin(attendance, eq(attendance.rsvpId, rsvps.id))
    .leftJoin(sessionScores, eq(sessionScores.rsvpId, rsvps.id))
    .where(eq(rsvps.learnerId, userId))
    .orderBy(desc(rsvps.bookedAt))
  if (rows.length === 0) return { now: at.toISOString(), items: [] }

  const sessionIds = [...new Set(rows.map((row) => row.rsvp.sessionId))]
  const [cards, reschedules] = await Promise.all([
    selectSessionCards(inArray(sessions.id, sessionIds)),
    db
      .select()
      .from(sessionReschedules)
      .where(inArray(sessionReschedules.sessionId, sessionIds))
      .orderBy(desc(sessionReschedules.createdAt)),
  ])
  const cardById = new Map(cards.map((card) => [card.session.id, card]))

  return {
    now: at.toISOString(),
    items: rows.flatMap((row) => {
      const card = cardById.get(row.rsvp.sessionId)
      if (!card) return []
      const lastMove = reschedules.find(
        (r) => r.sessionId === row.rsvp.sessionId && r.createdAt > row.rsvp.bookedAt,
      )
      const isFinal = row.scoreStatus === 'final'
      return [
        {
          rsvpId: row.rsvp.id,
          status: row.rsvp.status,
          waitlistPosition: row.rsvp.waitlistPosition,
          bookedAt: row.rsvp.bookedAt.toISOString(),
          cancelledReason: row.rsvp.cancelledReason,
          replacedByRsvpId: row.rsvp.replacedByRsvpId,
          attendance: row.attendance,
          // Learners see a score only once the trainer has finalised it.
          score: isFinal ? row.scoreTotal : null,
          feedback: isFinal ? row.feedback : null,
          selfServiceOpen: withinSelfService(card.session.startsAt, at),
          rescheduled: lastMove
            ? {
                previousStartsAt: lastMove.previousStartsAt.toISOString(),
                reason: lastMove.reason,
                at: lastMove.createdAt.toISOString(),
              }
            : null,
          session: toSessionView(card),
        },
      ]
    }),
  }
}

/** Confirms a seat, or joins the waitlist when the learner asks for it on a full session. */
export async function book(actor: Actor, input: BookingCreateInput) {
  const result = await db.transaction(async (tx) => {
    await lockLearnerBookings(tx, actor.id)
    await lockSession(tx, input.sessionId)
    const card = await getSessionCard(input.sessionId, tx)
    const ctx = await loadLearnerContext(tx, actor.id)
    const verdict = evaluate(card, ctx, now())
    if (verdict.state === 'booked') {
      throw refuse('ALREADY_BOOKED', 'You already have a booking for this session.')
    }
    if (verdict.state === 'locked') throw refuse(verdict.code, verdict.reason)
    if (verdict.state === 'waitlist' && !input.joinWaitlist) {
      throw refuse('SESSION_FULL', 'This session is full. You can join the waitlist.')
    }

    const waitlisted = verdict.state === 'waitlist'
    const position = waitlisted ? await nextWaitlistPosition(tx, input.sessionId) : null
    const [created] = await tx
      .insert(rsvps)
      .values({
        sessionId: input.sessionId,
        learnerId: actor.id,
        status: waitlisted ? 'waitlisted' : 'confirmed',
        waitlistPosition: position,
        bookedAt: now(),
      })
      .returning()
    if (!created) throw new Error('RSVP insert returned nothing')
    await syncCapacityStatus(tx, input.sessionId)
    await recordAudit(
      actor,
      {
        action: waitlisted ? 'rsvp.waitlist' : 'rsvp.create',
        objectType: 'rsvp',
        objectId: created.id,
        after: { sessionCode: card.session.code, status: created.status, position },
      },
      tx,
      actor.requestId,
    )
    return created
  })
  return { rsvpId: result.id, status: result.status, waitlistPosition: result.waitlistPosition }
}

const notActive = () => new HttpError(409, 'NOT_ACTIVE', 'This booking is no longer active.')

async function ownActiveRsvp(actor: Actor, rsvpId: string) {
  const [row] = await db
    .select({ rsvp: rsvps, startsAt: sessions.startsAt, code: sessions.code })
    .from(rsvps)
    .innerJoin(sessions, eq(sessions.id, rsvps.sessionId))
    .where(and(eq(rsvps.id, rsvpId), eq(rsvps.learnerId, actor.id)))
  // Someone else's booking answers exactly like a missing one, so IDs cannot be probed.
  if (!row) throw HttpError.notFound('Booking not found')
  if (!ACTIVE_RSVP.includes(row.rsvp.status as (typeof ACTIVE_RSVP)[number])) throw notActive()
  return row
}

/** Learner cancels their own booking. Inside 24 hours it must go to admin review instead. */
export async function cancel(actor: Actor, rsvpId: string, reason: string | undefined) {
  const row = await ownActiveRsvp(actor, rsvpId)
  if (!withinSelfService(row.startsAt, now())) {
    throw refuse('ADMIN_REVIEW_REQUIRED', ADMIN_REVIEW_MESSAGE)
  }
  await db.transaction(async (tx) => {
    await lockLearnerBookings(tx, actor.id)
    await lockSession(tx, row.rsvp.sessionId)
    if ((await currentRsvpStatus(tx, rsvpId)) !== row.rsvp.status) throw notActive()
    await tx
      .update(rsvps)
      .set({
        status: 'cancelled',
        waitlistPosition: null,
        cancelledReason: reason || 'Cancelled by the learner',
      })
      .where(eq(rsvps.id, rsvpId))
    if (row.rsvp.status === 'confirmed') {
      await promoteFromWaitlist(tx, row.rsvp.sessionId, actor.id)
    } else {
      await renumberWaitlist(tx, row.rsvp.sessionId)
    }
    await syncCapacityStatus(tx, row.rsvp.sessionId)
    await recordAudit(
      actor,
      {
        action: 'rsvp.cancel',
        objectType: 'rsvp',
        objectId: rsvpId,
        before: { status: row.rsvp.status, sessionCode: row.code },
        after: { status: 'cancelled' },
        reason: reason ?? null,
      },
      tx,
      actor.requestId,
    )
  })
  return { rsvpId, status: 'cancelled' as const }
}

/**
 * Learner reschedule (brief §6): the target passes the same eligibility and capacity checks,
 * the replacement seat is confirmed first, and only then is the original released, all in one
 * transaction holding both session locks.
 */
export async function move(actor: Actor, input: BookingMoveInput) {
  const row = await ownActiveRsvp(actor, input.rsvpId)
  if (row.rsvp.sessionId === input.toSessionId) {
    throw refuse('ALREADY_BOOKED', 'You are already booked on this session.')
  }
  if (!withinSelfService(row.startsAt, now())) {
    throw refuse('ADMIN_REVIEW_REQUIRED', ADMIN_REVIEW_MESSAGE)
  }

  const created = await db.transaction(async (tx) => {
    await lockLearnerBookings(tx, actor.id)
    // Lock in a stable order so two opposite moves cannot deadlock.
    for (const id of [row.rsvp.sessionId, input.toSessionId].sort()) await lockSession(tx, id)
    // A concurrent move or cancel of the same booking committed first: refuse, keep its result.
    if ((await currentRsvpStatus(tx, row.rsvp.id)) !== row.rsvp.status) throw notActive()

    const target = await getSessionCard(input.toSessionId, tx)
    const ctx = await loadLearnerContext(tx, actor.id)
    const verdict = evaluate(target, ctx, now(), row.rsvp.id)
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

    const [replacement] = await tx
      .insert(rsvps)
      .values({
        sessionId: input.toSessionId,
        learnerId: actor.id,
        status: 'confirmed',
        bookedAt: now(),
      })
      .returning()
    if (!replacement) throw new Error('RSVP insert returned nothing')
    const { confirmed } = await countActive(tx, input.toSessionId)
    if (confirmed > target.session.capacity) {
      throw refuse('SESSION_FULL', 'That session has just filled up. Your current seat is kept.')
    }

    // The replacement is confirmed: now release the original seat.
    await tx
      .update(rsvps)
      .set({
        status: 'moved',
        waitlistPosition: null,
        replacedByRsvpId: replacement.id,
        cancelledReason: 'Moved to another session by the learner',
      })
      .where(eq(rsvps.id, row.rsvp.id))
    if (row.rsvp.status === 'confirmed') {
      await promoteFromWaitlist(tx, row.rsvp.sessionId, actor.id)
    } else {
      await renumberWaitlist(tx, row.rsvp.sessionId)
    }
    await syncCapacityStatus(tx, row.rsvp.sessionId)
    await syncCapacityStatus(tx, input.toSessionId)
    await recordAudit(
      actor,
      {
        action: 'rsvp.reschedule',
        objectType: 'rsvp',
        objectId: row.rsvp.id,
        before: { sessionCode: row.code, status: row.rsvp.status },
        after: { sessionCode: target.session.code, rsvpId: replacement.id },
      },
      tx,
      actor.requestId,
    )
    return replacement
  })
  return { rsvpId: created.id, previousRsvpId: input.rsvpId, status: created.status }
}

/**
 * Inside 24 hours a learner cannot change the booking themselves: the request is logged for
 * admin review and the admins get an in-app message. One request per booking.
 */
export async function requestChange(
  actor: Actor,
  rsvpId: string,
  input: BookingChangeRequestInput,
) {
  const row = await ownActiveRsvp(actor, rsvpId)
  if (withinSelfService(row.startsAt, now())) {
    throw new HttpError(
      409,
      'SELF_SERVICE_OPEN',
      'You can still change this booking yourself in My sessions.',
    )
  }
  const [existing] = await db
    .select({ id: auditEvents.id })
    .from(auditEvents)
    .where(and(eq(auditEvents.action, 'rsvp.change_requested'), eq(auditEvents.objectId, rsvpId)))
    .limit(1)
  if (existing) return { requested: true, alreadyRequested: true }

  const [session] = await db
    .select({ title: sessions.title, startsAt: sessions.startsAt })
    .from(sessions)
    .where(eq(sessions.id, row.rsvp.sessionId))
  const [profile] = await db
    .select({ learnerCode: profiles.learnerCode })
    .from(profiles)
    .where(eq(profiles.userId, actor.id))
  const admins = await db.select({ id: user.id }).from(user).where(eq(user.role, 'admin'))

  await db.transaction(async (tx) => {
    await recordAudit(
      actor,
      {
        action: 'rsvp.change_requested',
        objectType: 'rsvp',
        objectId: rsvpId,
        after: { sessionId: row.rsvp.sessionId, sessionCode: row.code, kind: input.kind },
        reason: input.reason,
      },
      tx,
      actor.requestId,
    )
    await notify(
      {
        eventId: `evt-change-request-${rsvpId}`,
        kind: 'booking_change_request',
        recipientIds: admins.map((admin) => admin.id),
        ...changeRequestMessage(
          profile?.learnerCode ?? 'Learner',
          session?.title ?? row.code,
          session?.startsAt ?? row.startsAt,
          input.kind,
          input.reason,
        ),
        actorId: actor.id,
      },
      tx,
    )
  })
  return { requested: true, alreadyRequested: false }
}
