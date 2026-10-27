import { db } from '@server/db/connection'
import {
  auditEvents,
  notifications,
  profiles,
  programmes,
  rsvps,
  sessionReschedules,
  sessions,
  trainerProfiles,
} from '@server/db/schema'
import { now } from '@server/lib/clock'
import { HttpError } from '@server/lib/errors'
import { assertSessionInScope, type Scope } from '@server/middleware/scope.middleware'
import type { SessionRescheduleInput } from '@shared/schemas/session'
import { and, asc, eq, gt, inArray, ne, sql } from 'drizzle-orm'
import { recordAudit } from '../audit/audit.service'
import {
  cancelledMessage,
  firstNameOf,
  locationOf,
  rescheduledMessage,
  waitlistCancelledMessage,
  waitlistRescheduledMessage,
} from '../notifications/notification-copy'
import { notifyEach } from '../notifications/notifications.service'
import type { Actor } from './actor'
import {
  ACTIVE_RSVP,
  learnerOverlaps,
  lockSession,
  type Reader,
  selectSessionCards,
  type Tx,
  trainerOverlaps,
} from './session-store'
import { toSessionView } from './session-view'

/**
 * Trainer reschedule and cancellation (brief §10–11). Each confirmed action updates the session
 * once, notifies every affected active RSVP once (the event id is the dedupe key, so a retry
 * with the same idempotency key creates nothing), audits, and returns the counts the §11 modal
 * shows. RSVPs are preserved on reschedule; on cancellation they are released, never completed.
 */

async function activeBookings(executor: Reader, sessionId: string) {
  return executor
    .select({
      rsvpId: rsvps.id,
      learnerId: rsvps.learnerId,
      status: rsvps.status,
      position: rsvps.waitlistPosition,
      learnerCode: profiles.learnerCode,
      fullName: profiles.fullName,
    })
    .from(rsvps)
    .leftJoin(profiles, eq(profiles.userId, rsvps.learnerId))
    .where(and(eq(rsvps.sessionId, sessionId), inArray(rsvps.status, [...ACTIVE_RSVP])))
    .orderBy(asc(rsvps.status), asc(rsvps.waitlistPosition), asc(profiles.learnerCode))
}

async function copyContext(executor: Reader, session: typeof sessions.$inferSelect) {
  const [trainer] = await executor
    .select({ name: trainerProfiles.fullName })
    .from(trainerProfiles)
    .where(eq(trainerProfiles.id, session.trainerId))
  return {
    sessionTitle: session.title,
    trainerName: trainer?.name ?? 'your trainer',
    format: session.format,
    location: locationOf(session),
  }
}

/** Shown before confirming: who will be told, and who would clash with a proposed new time. */
export async function impact(
  scope: Scope,
  id: string,
  proposed?: { startsAt?: string; endsAt?: string },
) {
  await assertSessionInScope(scope, id)
  const bookings = await activeBookings(db, id)
  const confirmed = bookings.filter((b) => b.status === 'confirmed')
  let conflicts: string[] = []
  if (proposed?.startsAt && proposed.endsAt) {
    const overlaps = await learnerOverlaps(
      db,
      confirmed.map((b) => b.learnerId),
      new Date(proposed.startsAt),
      new Date(proposed.endsAt),
      id,
    )
    const clashing = new Set(overlaps.map((o) => o.learnerId))
    conflicts = confirmed.filter((b) => clashing.has(b.learnerId)).map((b) => b.learnerCode ?? '')
  }
  return {
    confirmed: confirmed.length,
    waitlisted: bookings.length - confirmed.length,
    learners: bookings.map((b) => ({
      learnerCode: b.learnerCode ?? 'Unknown',
      displayName: b.fullName ?? 'Learner',
      status: b.status,
      waitlistPosition: b.position,
    })),
    conflicts,
  }
}

const eventIdFor = (kind: 'reschedule' | 'cancel', code: string, key: string) =>
  `evt-${kind}-${code}-${key}`

async function notifiedRecipients(executor: Reader, eventId: string) {
  const rows = await executor
    .select({ recipientId: notifications.recipientId })
    .from(notifications)
    .where(and(eq(notifications.eventId, eventId), eq(notifications.channel, 'in_app')))
  return rows.length
}

export async function reschedule(
  actor: Actor,
  scope: Scope,
  id: string,
  input: SessionRescheduleInput,
) {
  await assertSessionInScope(scope, id)
  const startsAt = new Date(input.startsAt)
  const endsAt = new Date(input.endsAt)
  if (endsAt <= startsAt) throw HttpError.badRequest('End time must be after the start time.')

  return db.transaction(async (tx) => {
    const session = await lockSession(tx, id)
    const eventId = eventIdFor('reschedule', session.code, input.idempotencyKey)

    // Retry of an action that already went through: same answer, nothing new is sent.
    const [already] = await tx
      .select()
      .from(sessionReschedules)
      .where(eq(sessionReschedules.eventId, eventId))
    if (already) {
      return {
        eventId,
        replayed: true,
        affected: already.affectedRsvps,
        waitlistNotified: await notifiedRecipients(tx, `${eventId}:waitlist`),
        conflicts: [] as string[],
        venueChanged: already.previousVenue !== already.newVenue,
      }
    }

    if (session.status === 'cancelled' || session.status === 'completed') {
      throw new HttpError(
        409,
        'SESSION_CLOSED',
        'Cancelled and completed sessions cannot be rescheduled.',
      )
    }
    if (startsAt <= now()) throw HttpError.badRequest('Choose a new time in the future.')
    if (
      startsAt.getTime() === session.startsAt.getTime() &&
      endsAt.getTime() === session.endsAt.getTime()
    ) {
      throw HttpError.badRequest('Choose a new date or time.')
    }
    const clashes = await trainerOverlaps(tx, session.trainerId, startsAt, endsAt, id)
    if (clashes.length > 0) {
      throw new HttpError(
        409,
        'SCHEDULE_CONFLICT',
        `The new time overlaps ${clashes.map((c) => `${c.title} (${c.code})`).join(', ')}.`,
        { conflicts: clashes },
      )
    }

    const bookings = await activeBookings(tx, id)
    const confirmed = bookings.filter((b) => b.status === 'confirmed')
    const waitlisted = bookings.filter((b) => b.status === 'waitlisted')
    const overlaps = await learnerOverlaps(
      tx,
      confirmed.map((b) => b.learnerId),
      startsAt,
      endsAt,
      id,
    )
    const clashing = new Set(overlaps.map((o) => o.learnerId))

    const inPerson = session.format === 'in_person'
    // For in person, `venue` is the full new location ("Demo Academy, Room 2"); a changed
    // location replaces venue and room together so learners see one clear place.
    const previousLocation = locationOf(session)
    const venueMoved = inPerson && Boolean(input.venue) && input.venue !== previousLocation
    const newVenue = venueMoved ? (input.venue as string) : session.venue
    const newRoom = venueMoved ? null : session.room
    const newMeetingRef = inPerson ? session.meetingRef : (input.meetingRef ?? session.meetingRef)
    const shift = startsAt.getTime() - session.startsAt.getTime()
    const updated = {
      startsAt,
      endsAt,
      venue: newVenue,
      room: newRoom,
      meetingRef: newMeetingRef,
      bookingDeadline: session.bookingDeadline
        ? new Date(session.bookingDeadline.getTime() + shift)
        : null,
      updatedAt: now(),
    }
    await tx.update(sessions).set(updated).where(eq(sessions.id, id))
    await tx.insert(sessionReschedules).values({
      sessionId: id,
      previousStartsAt: session.startsAt,
      previousEndsAt: session.endsAt,
      newStartsAt: startsAt,
      newEndsAt: endsAt,
      previousVenue: inPerson ? previousLocation : session.meetingRef,
      newVenue: inPerson
        ? locationOf({ ...session, venue: newVenue, room: newRoom })
        : newMeetingRef,
      reason: input.reason,
      affectedRsvps: confirmed.length,
      eventId,
      changedBy: actor.id,
      createdAt: now(),
      updatedAt: now(),
    })

    const ctx = await copyContext(tx, { ...session, ...updated })
    const affected = await notifyEach(
      { eventId, kind: 'session_rescheduled', sessionId: id, actorId: actor.id },
      confirmed.map((b) => ({
        recipientId: b.learnerId,
        ...rescheduledMessage(
          ctx,
          firstNameOf(b.fullName ?? 'there'),
          session.startsAt,
          startsAt,
          input.reason,
        ),
      })),
      tx,
    )
    const waitlistNotified = await notifyEach(
      {
        eventId: `${eventId}:waitlist`,
        kind: 'session_waitlist_update',
        sessionId: id,
        actorId: actor.id,
      },
      waitlisted.map((b) => ({
        recipientId: b.learnerId,
        ...waitlistRescheduledMessage(
          ctx,
          firstNameOf(b.fullName ?? 'there'),
          session.startsAt,
          startsAt,
          b.position ?? 1,
        ),
      })),
      tx,
    )

    await recordAudit(
      actor,
      {
        action: 'session.reschedule',
        objectType: 'session',
        objectId: id,
        before: { startsAt: session.startsAt.toISOString(), location: locationOf(session) },
        after: {
          startsAt: startsAt.toISOString(),
          location: ctx.location,
          notified: affected,
          waitlistNotified,
          eventId,
        },
        reason: input.reason,
      },
      tx,
      actor.requestId,
    )
    return {
      eventId,
      replayed: false,
      affected,
      waitlistNotified,
      conflicts: confirmed.filter((b) => clashing.has(b.learnerId)).map((b) => b.learnerCode ?? ''),
      venueChanged: inPerson ? venueMoved : session.meetingRef !== newMeetingRef,
    }
  })
}

/** Open sessions in the same programme with free seats: what a cancellation offers instead. */
async function alternativesFor(executor: Reader, session: typeof sessions.$inferSelect) {
  const cards = await selectSessionCards(
    and(
      eq(sessions.programmeId, session.programmeId),
      ne(sessions.id, session.id),
      inArray(sessions.status, ['published']),
      gt(sessions.startsAt, now()),
    ),
    executor,
  )
  return cards
    .filter((card) => card.confirmed < card.session.capacity)
    .slice(0, 4)
    .map(toSessionView)
}

export async function cancelSession(
  actor: Actor,
  scope: Scope,
  id: string,
  input: { reason: string; idempotencyKey: string },
) {
  await assertSessionInScope(scope, id)
  return db.transaction(async (tx: Tx) => {
    const session = await lockSession(tx, id)
    const eventId = eventIdFor('cancel', session.code, input.idempotencyKey)

    if (session.status === 'cancelled') {
      const sent = await notifiedRecipients(tx, eventId)
      if (sent === 0 && !(await hasAudit(tx, eventId))) {
        throw new HttpError(409, 'ALREADY_CANCELLED', 'This session is already cancelled.')
      }
      return {
        eventId,
        replayed: true,
        affected: sent,
        waitlistNotified: await notifiedRecipients(tx, `${eventId}:waitlist`),
        alternatives: await alternativesFor(tx, session),
      }
    }
    if (session.status === 'completed') {
      throw new HttpError(409, 'SESSION_CLOSED', 'A completed session cannot be cancelled.')
    }

    const bookings = await activeBookings(tx, id)
    const confirmed = bookings.filter((b) => b.status === 'confirmed')
    const waitlisted = bookings.filter((b) => b.status === 'waitlisted')

    // History is kept: the session and its RSVPs stay, marked cancelled. No attendance or
    // completion is recorded, so nothing unlocks.
    await tx
      .update(sessions)
      .set({ status: 'cancelled', cancelledReason: input.reason, updatedAt: now() })
      .where(eq(sessions.id, id))
    if (bookings.length > 0) {
      await tx
        .update(rsvps)
        .set({
          status: 'cancelled',
          waitlistPosition: null,
          cancelledReason: 'Session cancelled by the Academy',
        })
        .where(
          inArray(
            rsvps.id,
            bookings.map((b) => b.rsvpId),
          ),
        )
    }

    const ctx = await copyContext(tx, session)
    const affected = await notifyEach(
      { eventId, kind: 'session_cancelled', sessionId: id, actorId: actor.id },
      confirmed.map((b) => ({
        recipientId: b.learnerId,
        ...cancelledMessage(
          ctx,
          firstNameOf(b.fullName ?? 'there'),
          session.startsAt,
          input.reason,
        ),
      })),
      tx,
    )
    const waitlistNotified = await notifyEach(
      {
        eventId: `${eventId}:waitlist`,
        kind: 'session_waitlist_update',
        sessionId: id,
        actorId: actor.id,
      },
      waitlisted.map((b) => ({
        recipientId: b.learnerId,
        ...waitlistCancelledMessage(
          ctx,
          firstNameOf(b.fullName ?? 'there'),
          session.startsAt,
          input.reason,
        ),
      })),
      tx,
    )
    await recordAudit(
      actor,
      {
        action: 'session.cancel',
        objectType: 'session',
        objectId: id,
        before: {
          status: session.status,
          confirmed: confirmed.length,
          waitlisted: waitlisted.length,
        },
        after: { status: 'cancelled', notified: affected, waitlistNotified, eventId },
        reason: input.reason,
      },
      tx,
      actor.requestId,
    )
    return {
      eventId,
      replayed: false,
      affected,
      waitlistNotified,
      alternatives: await alternativesFor(tx, session),
    }
  })
}

async function hasAudit(executor: Reader, eventId: string) {
  const rows = await executor
    .select({ id: auditEvents.id })
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.action, 'session.cancel'),
        sql`${auditEvents.after}->>'eventId' = ${eventId}`,
      ),
    )
    .limit(1)
  return rows.length > 0
}

/** Programme code of a session, for progress recomputation elsewhere. */
export async function programmeOf(executor: Reader, sessionId: string) {
  const [row] = await executor
    .select({ code: programmes.code })
    .from(sessions)
    .innerJoin(programmes, eq(programmes.id, sessions.programmeId))
    .where(eq(sessions.id, sessionId))
  return row?.code ?? null
}
