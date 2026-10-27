import { profiles, rsvps, sessions, trainerProfiles } from '@server/db/schema'
import { and, asc, eq, isNull } from 'drizzle-orm'
import {
  firstNameOf,
  locationOf,
  waitlistPromotedMessage,
} from '../notifications/notification-copy'
import { notifyEach } from '../notifications/notifications.service'
import { countActive, type Tx } from '../sessions/session-store'

/** Renumbers the queue 1..n in its current order. */
export async function renumberWaitlist(tx: Tx, sessionId: string) {
  const queue = await tx
    .select({ id: rsvps.id, position: rsvps.waitlistPosition })
    .from(rsvps)
    .where(and(eq(rsvps.sessionId, sessionId), eq(rsvps.status, 'waitlisted')))
    .orderBy(asc(rsvps.waitlistPosition), asc(rsvps.bookedAt))
  for (const [index, row] of queue.entries()) {
    if (row.position !== index + 1) {
      await tx
        .update(rsvps)
        .set({ waitlistPosition: index + 1 })
        .where(eq(rsvps.id, row.id))
    }
  }
  return queue.length
}

/** Next place in the queue. */
export async function nextWaitlistPosition(tx: Tx, sessionId: string) {
  return (await renumberWaitlist(tx, sessionId)) + 1
}

/**
 * Fills free seats from the waitlist in queue order and tells each promoted learner, once
 * (the event id is the promoted RSVP). Call with the session lock held.
 */
export async function promoteFromWaitlist(tx: Tx, sessionId: string, actorId: string | null) {
  const [session] = await tx
    .select({
      session: sessions,
      trainerName: trainerProfiles.fullName,
    })
    .from(sessions)
    .innerJoin(trainerProfiles, eq(trainerProfiles.id, sessions.trainerId))
    .where(eq(sessions.id, sessionId))
  if (!session || !['published', 'full'].includes(session.session.status)) return []

  const { confirmed } = await countActive(tx, sessionId)
  const free = session.session.capacity - confirmed
  if (free <= 0) return []

  const queue = await tx
    .select({ id: rsvps.id, learnerId: rsvps.learnerId, fullName: profiles.fullName })
    .from(rsvps)
    .leftJoin(profiles, eq(profiles.userId, rsvps.learnerId))
    .where(and(eq(rsvps.sessionId, sessionId), eq(rsvps.status, 'waitlisted')))
    .orderBy(asc(rsvps.waitlistPosition), asc(rsvps.bookedAt))
    .limit(free)

  const ctx = {
    sessionTitle: session.session.title,
    trainerName: session.trainerName,
    format: session.session.format,
    location: locationOf(session.session),
  }
  for (const row of queue) {
    await tx
      .update(rsvps)
      .set({ status: 'confirmed', waitlistPosition: null })
      .where(and(eq(rsvps.id, row.id), isNull(rsvps.replacedByRsvpId)))
    await notifyEach(
      { eventId: `evt-waitlist-promoted-${row.id}`, kind: 'waitlist_promoted', sessionId, actorId },
      [
        {
          recipientId: row.learnerId,
          ...waitlistPromotedMessage(
            ctx,
            firstNameOf(row.fullName ?? 'there'),
            session.session.startsAt,
          ),
        },
      ],
      tx,
    )
  }
  await renumberWaitlist(tx, sessionId)
  return queue.map((row) => row.learnerId)
}
