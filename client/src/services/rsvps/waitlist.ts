import type { RsvpRow } from '@shared/types/db'
import { db, updateRow } from '../api'
import { firstNameOf, locationOf, waitlistPromotedMessage } from '../notifications/copy'
import { notifyEach } from '../notifications.service'
import { countActive, ms } from '../sessions/store'

/** The session's waitlist in queue order (position, then booking time). */
function queueOf(sessionId: string): RsvpRow[] {
  return db.rsvps
    .filter((r) => r.sessionId === sessionId && r.status === 'waitlisted')
    .sort(
      (a, b) =>
        (a.waitlistPosition ?? Number.MAX_SAFE_INTEGER) -
          (b.waitlistPosition ?? Number.MAX_SAFE_INTEGER) || ms(a.bookedAt) - ms(b.bookedAt),
    )
}

/** Renumbers the queue 1..n in its current order. Returns its length. */
export function renumberWaitlist(sessionId: string): number {
  const queue = queueOf(sessionId)
  for (const [index, row] of queue.entries()) {
    if (row.waitlistPosition !== index + 1) updateRow(row, { waitlistPosition: index + 1 })
  }
  return queue.length
}

/** Next place in the queue. */
export function nextWaitlistPosition(sessionId: string): number {
  return renumberWaitlist(sessionId) + 1
}

/**
 * Fills free seats from the waitlist in queue order and tells each promoted learner, once (the
 * event id is the promoted RSVP). Returns the promoted learners' user ids.
 */
export function promoteFromWaitlist(sessionId: string, actorId: string | null): string[] {
  const session = db.sessions.find((s) => s.id === sessionId)
  if (!session || !['published', 'full'].includes(session.status)) return []
  const trainer = db.trainerProfiles.find((t) => t.id === session.trainerId)
  if (!trainer) return []

  const { confirmed } = countActive(sessionId)
  const free = session.capacity - confirmed
  if (free <= 0) return []

  const queue = queueOf(sessionId).slice(0, free)
  const ctx = {
    sessionTitle: session.title,
    trainerName: trainer.fullName,
    format: session.format,
    location: locationOf(session),
  }
  for (const row of queue) {
    if (row.replacedByRsvpId === null) {
      updateRow(row, { status: 'confirmed', waitlistPosition: null })
    }
    const fullName = db.profiles.find((p) => p.userId === row.learnerId)?.fullName ?? 'there'
    notifyEach(
      { eventId: `evt-waitlist-promoted-${row.id}`, kind: 'waitlist_promoted', sessionId, actorId },
      [
        {
          recipientId: row.learnerId,
          ...waitlistPromotedMessage(ctx, firstNameOf(fullName), new Date(session.startsAt)),
        },
      ],
    )
  }
  renumberWaitlist(sessionId)
  return queue.map((row) => row.learnerId)
}
