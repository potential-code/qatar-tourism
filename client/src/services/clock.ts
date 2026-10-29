import { ANCHOR_HOUR_QATAR, qatarInstant, todayInQatar } from '@shared/utils/qatar-calendar'
import { db } from '@/mocks/db'

/**
 * The demo clock (brief §15–16, formerly server/lib/clock.ts). "Now" is the reference date at
 * 08:00 Qatar time, advancing in real time from the moment the clock was anchored (page load or
 * the last reset). Right after a load, "Day +2 09:00" is therefore still two days away however
 * long ago the snapshot was made, and timestamps written during a walkthrough still increase.
 *
 * Services call `now()`; they never call `new Date()` for business logic.
 */

let anchoredAt = Date.now()

/** Restarts the clock at 08:00 on the reference date (called after a reset). */
export function anchorClock(): void {
  anchoredAt = Date.now()
}

/** The reference date in force (YYYY-MM-DD), or today before the database is loaded. */
export function referenceDate(): string {
  return db.meta?.referenceDate ?? todayInQatar()
}

/** The demo's current instant. */
export function now(): Date {
  const hour = `${String(ANCHOR_HOUR_QATAR).padStart(2, '0')}:00`
  const base = qatarInstant(referenceDate(), hour)
  return new Date(base.getTime() + (Date.now() - anchoredAt))
}

/** `now()` as an ISO string, the form rows store. */
export const nowIso = (): string => now().toISOString()
