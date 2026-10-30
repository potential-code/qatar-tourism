import type { SessionRescheduleInput } from '@shared/schemas/session'
import type { SessionRow } from '@shared/types/db'
import {
  ApiError,
  assertSessionInScope,
  db,
  insertRow,
  now,
  type Scope,
  updateRow,
  type Viewer,
} from '../api'
import { recordAudit } from '../audit.service'
import {
  cancelledMessage,
  firstNameOf,
  locationOf,
  rescheduledMessage,
  waitlistCancelledMessage,
  waitlistRescheduledMessage,
} from '../notifications/copy'
import { notifyEach } from '../notifications.service'
import {
  findSession,
  isActiveRsvp,
  learnerOverlaps,
  ms,
  rsvpStatusRank,
  selectSessionCards,
  trainerOverlaps,
} from './store'
import { toSessionView } from './view'

/**
 * Trainer reschedule and cancellation (brief §10–11, formerly session-changes.service.ts). Each
 * confirmed action updates the session once, notifies every affected active RSVP once (the
 * event id is the dedupe key, so a retry with the same idempotency key creates nothing),
 * audits, and returns the counts the §11 modal shows. RSVPs are preserved on reschedule; on
 * cancellation they are released, never completed. Synchronous; the service commits.
 */

/** Active bookings of a session: confirmed first, then the waitlist in order, then learner ID. */
export function activeBookings(sessionId: string) {
  const profiles = new Map(db.profiles.map((p) => [p.userId, p]))
  return db.rsvps
    .filter((r) => r.sessionId === sessionId && isActiveRsvp(r))
    .map((r) => {
      const profile = profiles.get(r.learnerId)
      return {
        rsvp: r,
        rsvpId: r.id,
        learnerId: r.learnerId,
        status: r.status as 'confirmed' | 'waitlisted' | 'offered',
        position: r.waitlistPosition,
        learnerCode: profile?.learnerCode ?? null,
        fullName: profile?.fullName ?? null,
      }
    })
    .sort(
      (a, b) =>
        rsvpStatusRank(a.status) - rsvpStatusRank(b.status) ||
        (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER) ||
        (a.learnerCode ?? '').localeCompare(b.learnerCode ?? ''),
    )
}

function copyContext(session: SessionRow) {
  const trainer = db.trainerProfiles.find((t) => t.id === session.trainerId)
  return {
    sessionTitle: session.title,
    trainerName: trainer?.fullName ?? 'your trainer',
    format: session.format,
    location: locationOf(session),
  }
}

/** Shown before confirming: who will be told, and who would clash with a proposed new time. */
export function impact(
  scope: Scope,
  id: string,
  proposed?: { startsAt?: string; endsAt?: string },
) {
  assertSessionInScope(scope, id)
  findSession(id)
  const bookings = activeBookings(id)
  const confirmed = bookings.filter((b) => b.status === 'confirmed')
  let conflicts: string[] = []
  if (proposed?.startsAt && proposed.endsAt) {
    const clashing = new Set(
      learnerOverlaps(
        confirmed.map((b) => b.learnerId),
        new Date(proposed.startsAt),
        new Date(proposed.endsAt),
        id,
      ).map((o) => o.learnerId),
    )
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

/** In-app recipients already notified for an event (a replay reports the same counts). */
const notifiedRecipients = (eventId: string) =>
  db.notifications.filter((n) => n.eventId === eventId && n.channel === 'in_app').length

export function reschedule(actor: Viewer, scope: Scope, id: string, input: SessionRescheduleInput) {
  assertSessionInScope(scope, id)
  const startsAt = new Date(input.startsAt)
  const endsAt = new Date(input.endsAt)
  if (endsAt <= startsAt) throw ApiError.badRequest('End time must be after the start time.')

  const session = findSession(id)
  const eventId = eventIdFor('reschedule', session.code, input.idempotencyKey)

  // Retry of an action that already went through: same answer, nothing new is sent.
  const already = db.sessionReschedules.find((r) => r.eventId === eventId)
  if (already) {
    return {
      eventId,
      replayed: true,
      affected: already.affectedRsvps,
      waitlistNotified: notifiedRecipients(`${eventId}:waitlist`),
      conflicts: [] as string[],
      venueChanged: already.previousVenue !== already.newVenue,
    }
  }

  if (session.status === 'cancelled' || session.status === 'completed') {
    throw ApiError.conflict(
      'SESSION_CLOSED',
      'Cancelled and completed sessions cannot be rescheduled.',
    )
  }
  if (startsAt <= now()) throw ApiError.badRequest('Choose a new time in the future.')
  if (startsAt.getTime() === ms(session.startsAt) && endsAt.getTime() === ms(session.endsAt)) {
    throw ApiError.badRequest('Choose a new date or time.')
  }
  const clashes = trainerOverlaps(session.trainerId, startsAt, endsAt, id)
  if (clashes.length > 0) {
    throw ApiError.conflict(
      'SCHEDULE_CONFLICT',
      `The new time overlaps ${clashes.map((c) => `${c.title} (${c.code})`).join(', ')}.`,
      { conflicts: clashes },
    )
  }

  const bookings = activeBookings(id)
  const confirmed = bookings.filter((b) => b.status === 'confirmed')
  const waitlisted = bookings.filter((b) => b.status !== 'confirmed')
  const clashing = new Set(
    learnerOverlaps(
      confirmed.map((b) => b.learnerId),
      startsAt,
      endsAt,
      id,
    ).map((o) => o.learnerId),
  )

  const previous = { ...session }
  const inPerson = session.format === 'in_person'
  // For in person, `venue` is the full new location ("Demo Academy, Room 2"); a changed
  // location replaces venue and room together so learners see one clear place.
  const previousLocation = locationOf(session)
  const venueMoved = inPerson && Boolean(input.venue) && input.venue !== previousLocation
  const newVenue = venueMoved ? (input.venue as string) : session.venue
  const newRoom = venueMoved ? null : session.room
  const newMeetingRef = inPerson ? session.meetingRef : (input.meetingRef ?? session.meetingRef)
  const shift = startsAt.getTime() - ms(session.startsAt)
  updateRow(session, {
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    venue: newVenue,
    room: newRoom,
    meetingRef: newMeetingRef,
    bookingDeadline: session.bookingDeadline
      ? new Date(ms(session.bookingDeadline) + shift).toISOString()
      : null,
  })
  insertRow('sessionReschedules', {
    sessionId: id,
    previousStartsAt: previous.startsAt,
    previousEndsAt: previous.endsAt,
    newStartsAt: session.startsAt,
    newEndsAt: session.endsAt,
    previousVenue: inPerson ? previousLocation : previous.meetingRef,
    newVenue: inPerson ? locationOf(session) : newMeetingRef,
    reason: input.reason,
    affectedRsvps: confirmed.length,
    eventId,
    changedBy: actor.id,
  })

  const ctx = copyContext(session)
  const previousStart = new Date(previous.startsAt)
  const affected = notifyEach(
    { eventId, kind: 'session_rescheduled', sessionId: id, actorId: actor.id },
    confirmed.map((b) => ({
      recipientId: b.learnerId,
      ...rescheduledMessage(
        ctx,
        firstNameOf(b.fullName ?? 'there'),
        previousStart,
        startsAt,
        input.reason,
      ),
    })),
  )
  const waitlistNotified = notifyEach(
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
        previousStart,
        startsAt,
        b.position ?? 1,
      ),
    })),
  )

  recordAudit(actor, {
    action: 'session.reschedule',
    objectType: 'session',
    objectId: id,
    before: { startsAt: new Date(previous.startsAt).toISOString(), location: previousLocation },
    after: {
      startsAt: startsAt.toISOString(),
      location: ctx.location,
      notified: affected,
      waitlistNotified,
      eventId,
    },
    reason: input.reason,
  })
  return {
    eventId,
    replayed: false,
    affected,
    waitlistNotified,
    conflicts: confirmed.filter((b) => clashing.has(b.learnerId)).map((b) => b.learnerCode ?? ''),
    venueChanged: inPerson ? venueMoved : previous.meetingRef !== newMeetingRef,
  }
}

/** Open sessions in the same programme with free seats: what a cancellation offers instead. */
function alternativesFor(session: SessionRow) {
  const at = now().getTime()
  return selectSessionCards(
    (s) =>
      s.programmeId === session.programmeId &&
      s.id !== session.id &&
      s.status === 'published' &&
      ms(s.startsAt) > at,
  )
    .filter((card) => card.confirmed < card.session.capacity)
    .slice(0, 4)
    .map(toSessionView)
}

const hasCancelAudit = (eventId: string) =>
  db.auditEvents.some((e) => e.action === 'session.cancel' && e.after?.eventId === eventId)

export function cancelSession(
  actor: Viewer,
  scope: Scope,
  id: string,
  input: { reason: string; idempotencyKey: string },
) {
  assertSessionInScope(scope, id)
  const session = findSession(id)
  const eventId = eventIdFor('cancel', session.code, input.idempotencyKey)

  if (session.status === 'cancelled') {
    const sent = notifiedRecipients(eventId)
    if (sent === 0 && !hasCancelAudit(eventId)) {
      throw ApiError.conflict('ALREADY_CANCELLED', 'This session is already cancelled.')
    }
    return {
      eventId,
      replayed: true,
      affected: sent,
      waitlistNotified: notifiedRecipients(`${eventId}:waitlist`),
      alternatives: alternativesFor(session),
    }
  }
  if (session.status === 'completed') {
    throw ApiError.conflict('SESSION_CLOSED', 'A completed session cannot be cancelled.')
  }

  const bookings = activeBookings(id)
  const confirmed = bookings.filter((b) => b.status === 'confirmed')
  const waitlisted = bookings.filter((b) => b.status !== 'confirmed')
  const previousStatus = session.status

  // History is kept: the session and its RSVPs stay, marked cancelled. No attendance or
  // completion is recorded, so nothing unlocks.
  updateRow(session, { status: 'cancelled', cancelledReason: input.reason })
  for (const b of bookings) {
    updateRow(b.rsvp, {
      status: 'cancelled',
      waitlistPosition: null,
      cancelledReason: 'Session cancelled by the Academy',
    })
  }

  const ctx = copyContext(session)
  const start = new Date(session.startsAt)
  const affected = notifyEach(
    { eventId, kind: 'session_cancelled', sessionId: id, actorId: actor.id },
    confirmed.map((b) => ({
      recipientId: b.learnerId,
      ...cancelledMessage(ctx, firstNameOf(b.fullName ?? 'there'), start, input.reason),
    })),
  )
  const waitlistNotified = notifyEach(
    {
      eventId: `${eventId}:waitlist`,
      kind: 'session_waitlist_update',
      sessionId: id,
      actorId: actor.id,
    },
    waitlisted.map((b) => ({
      recipientId: b.learnerId,
      ...waitlistCancelledMessage(ctx, firstNameOf(b.fullName ?? 'there'), start, input.reason),
    })),
  )
  recordAudit(actor, {
    action: 'session.cancel',
    objectType: 'session',
    objectId: id,
    before: { status: previousStatus, confirmed: confirmed.length, waitlisted: waitlisted.length },
    after: { status: 'cancelled', notified: affected, waitlistNotified, eventId },
    reason: input.reason,
  })
  return {
    eventId,
    replayed: false,
    affected,
    waitlistNotified,
    alternatives: alternativesFor(session),
  }
}
