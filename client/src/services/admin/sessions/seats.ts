import { db, indexBy, updateRow } from '../../api'
import { firstNameOf, locationOf, waitlistPromotedMessage } from '../../notifications/copy'
import { notifyEach } from '../../notifications.service'

/**
 * Seat bookkeeping after an admin releases a booking: the minimal subset of the old
 * rsvps/waitlist.ts and sessions/session-store.ts this module needs. The sessions/rsvps port
 * (Agent D) owns the full versions; dedupe onto those at merge.
 */

const confirmedCount = (sessionId: string) =>
  db.rsvps.filter((r) => r.sessionId === sessionId && r.status === 'confirmed').length

const queueOf = (sessionId: string) =>
  db.rsvps
    .filter((r) => r.sessionId === sessionId && r.status === 'waitlisted')
    .sort(
      (a, b) =>
        (a.waitlistPosition ?? Number.MAX_SAFE_INTEGER) -
          (b.waitlistPosition ?? Number.MAX_SAFE_INTEGER) || a.bookedAt.localeCompare(b.bookedAt),
    )

/** Renumbers the queue 1..n in its current order. */
export function renumberWaitlist(sessionId: string): number {
  const queue = queueOf(sessionId)
  queue.forEach((row, index) => {
    if (row.waitlistPosition !== index + 1) updateRow(row, { waitlistPosition: index + 1 })
  })
  return queue.length
}

/** Fills free seats from the waitlist in queue order and tells each promoted learner once. */
export function promoteFromWaitlist(sessionId: string, actorId: string | null): string[] {
  const session = db.sessions.find((s) => s.id === sessionId)
  if (!session || (session.status !== 'published' && session.status !== 'full')) return []
  const free = session.capacity - confirmedCount(sessionId)
  if (free <= 0) return []
  const trainer = db.trainerProfiles.find((t) => t.id === session.trainerId)
  const profiles = indexBy(db.profiles, (p) => p.userId)
  const ctx = {
    sessionTitle: session.title,
    trainerName: trainer?.fullName ?? 'your trainer',
    format: session.format,
    location: locationOf(session),
  }
  const promoted = queueOf(sessionId)
    .filter((row) => row.replacedByRsvpId === null)
    .slice(0, free)
  for (const row of promoted) {
    updateRow(row, { status: 'confirmed', waitlistPosition: null })
    notifyEach(
      { eventId: `evt-waitlist-promoted-${row.id}`, kind: 'waitlist_promoted', sessionId, actorId },
      [
        {
          recipientId: row.learnerId,
          ...waitlistPromotedMessage(
            ctx,
            firstNameOf(profiles.get(row.learnerId)?.fullName ?? 'there'),
            new Date(session.startsAt),
          ),
        },
      ],
    )
  }
  renumberWaitlist(sessionId)
  return promoted.map((row) => row.learnerId)
}

/** Published and Full follow the seat count. Draft, Completed and Cancelled never change here. */
export function syncCapacityStatus(sessionId: string) {
  const session = db.sessions.find((s) => s.id === sessionId)
  if (!session || (session.status !== 'published' && session.status !== 'full'))
    return session?.status ?? null
  const next = confirmedCount(sessionId) >= session.capacity ? 'full' : 'published'
  if (next !== session.status) updateRow(session, { status: next })
  return next
}
