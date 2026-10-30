import type { RsvpRow } from '@shared/types/db'
import { db, updateRow } from '../api'
import { ms } from '../sessions/store'

/**
 * The waitlist queue. Freed seats are no longer given straight to the head of the queue: they
 * become time-limited offers (see offers.ts).
 */

/** The session's waitlist in queue order (position, then booking time). */
export function waitlistQueue(sessionId: string): RsvpRow[] {
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
  const queue = waitlistQueue(sessionId)
  for (const [index, row] of queue.entries()) {
    if (row.waitlistPosition !== index + 1) updateRow(row, { waitlistPosition: index + 1 })
  }
  return queue.length
}

/** Next place in the queue. */
export function nextWaitlistPosition(sessionId: string): number {
  return renumberWaitlist(sessionId) + 1
}
