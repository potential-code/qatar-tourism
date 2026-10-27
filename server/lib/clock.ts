/**
 * The demo clock (brief §15–16).
 *
 * Every "Day +N" / "Day -N" offset in the seed is relative to the DEMO REFERENCE DATE, a plain
 * calendar date (YYYY-MM-DD) read in Qatar time. It comes from the env var DEMO_REFERENCE_DATE
 * or, when unset, is today's date at seed time. The seed stores it (with the moment it was
 * anchored) in `demo_meta`, so the app and the seed agree on it.
 *
 * `now()` is the demo's "current instant": the reference date at 08:00 Qatar time, advancing in
 * real time from the moment the seed ran. Right after a reset, "Day +2 09:00" is therefore
 * still two days away however long ago the snapshot was first made; and unlike a frozen clock,
 * timestamps written during a walkthrough still increase.
 *
 * Services call `now()`; they never call `new Date()` for business logic.
 */

export const QATAR_TIMEZONE = 'Asia/Qatar'
/** Qatar has no daylight saving: UTC+3 all year. */
export const QATAR_UTC_OFFSET_HOURS = 3
/** The demo "wall clock" at the moment the snapshot is anchored, in Qatar time. */
export const ANCHOR_HOUR_QATAR = 8

const DAY_MS = 86_400_000

export type ClockState = {
  /** YYYY-MM-DD, interpreted in Qatar time. */
  referenceDate: string
  /** Real instant at which the demo clock read `referenceDate` 08:00 Qatar. */
  anchoredAt: Date
}

let state: ClockState | null = null

/** Today's date (UTC date of the real clock shifted to Qatar), as YYYY-MM-DD. */
export function todayInQatar(real: Date = new Date()): string {
  return new Date(real.getTime() + QATAR_UTC_OFFSET_HOURS * 3_600_000).toISOString().slice(0, 10)
}

/** The UTC instant of `HH:mm` Qatar time on the given calendar date. */
export function qatarInstant(date: string, time = '00:00'): Date {
  const [hours = 0, minutes = 0] = time.split(':').map(Number)
  const [year = 1970, month = 1, day = 1] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, hours - QATAR_UTC_OFFSET_HOURS, minutes))
}

/** The calendar date `days` after (or before, if negative) `date`. */
export function addDays(date: string, days: number): string {
  return new Date(qatarInstant(date).getTime() + days * DAY_MS + 3_600_000 * QATAR_UTC_OFFSET_HOURS)
    .toISOString()
    .slice(0, 10)
}

/** "Day +2, 09:00": the UTC instant of an offset from the reference date, in Qatar time. */
export function dayOffsetAt(referenceDate: string, offsetDays: number, time = '00:00'): Date {
  return qatarInstant(addDays(referenceDate, offsetDays), time)
}

/** Reference date from the environment, falling back to today (Qatar). */
export function resolveReferenceDate(configured?: string): string {
  return configured ?? todayInQatar()
}

export function setClockState(next: ClockState | null): void {
  state = next
}

export function getClockState(): ClockState | null {
  return state
}

/** Reference date in force, or today when no snapshot has been anchored yet. */
export function referenceDate(): string {
  return state?.referenceDate ?? todayInQatar()
}

/** The demo's current instant. Without an anchored snapshot it is the real time. */
export function now(): Date {
  if (!state) return new Date()
  const base = qatarInstant(state.referenceDate, `${String(ANCHOR_HOUR_QATAR).padStart(2, '0')}:00`)
  return new Date(base.getTime() + (Date.now() - state.anchoredAt.getTime()))
}

/** Whole days between two dates' calendar days (b - a). */
export function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / DAY_MS)
}
