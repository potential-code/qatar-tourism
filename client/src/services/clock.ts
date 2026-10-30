import { ANCHOR_HOUR_QATAR, DAY_MS, qatarInstant, todayInQatar } from '@shared/utils/qatar-calendar'
import { db } from '@/mocks/db'

/**
 * The demo clock (brief §15–16, formerly server/lib/clock.ts). "Now" is the reference date at
 * 08:00 Qatar time, advancing in real time from the moment the snapshot was seeded (first load or
 * the last reset), as the server clock did. The anchor is saved with the snapshot, so "now" keeps
 * moving forward across reloads and writes made during a walkthrough never look later than "now".
 * Reset before a demo to bring upcoming sessions back to their seeded offsets.
 *
 * The presenter can also move the clock forward by whole days (`meta.clockOffsetDays`, set by
 * clock.service.ts) to show reminders and expiry without touching the device date. A reset reseeds
 * `meta`, which sets the offset back to 0. Never change `meta.referenceDate` to move time:
 * `loadDb` reseeds when it differs from the configured one.
 *
 * Services call `now()`; they never call `new Date()` for business logic.
 */

/** Fallback anchor before the database is loaded. */
let loadedAt = Date.now()

/** Real time the clock counts from: the snapshot's `seededAt`, saved with it. */
const anchoredAt = (): number => {
  const seeded = db.meta?.seededAt ? Date.parse(db.meta.seededAt) : Number.NaN
  return Number.isNaN(seeded) ? loadedAt : seeded
}

/** Restarts the fallback anchor. A reset reseeds, which re-anchors through `seededAt`. */
export function anchorClock(): void {
  loadedAt = Date.now()
}

/** The reference date in force (YYYY-MM-DD), or today before the database is loaded. */
export function referenceDate(): string {
  return db.meta?.referenceDate ?? todayInQatar()
}

/** The demo's current instant. */
export function now(): Date {
  const hour = `${String(ANCHOR_HOUR_QATAR).padStart(2, '0')}:00`
  const base = qatarInstant(referenceDate(), hour)
  const offset = (db.meta?.clockOffsetDays ?? 0) * DAY_MS
  return new Date(base.getTime() + offset + (Date.now() - anchoredAt()))
}

/** `now()` as an ISO string, the form rows store. */
export const nowIso = (): string => now().toISOString()
