/**
 * Qatar calendar arithmetic (formerly server/lib/clock.ts). Pure functions: the demo clock that
 * uses them lives in client/src/services/clock.ts.
 *
 * A reference date is a plain calendar date (YYYY-MM-DD) read in Qatar time. Qatar has no
 * daylight saving, so it is UTC+3 all year.
 */

export const QATAR_TIMEZONE = 'Asia/Qatar'
export const QATAR_UTC_OFFSET_HOURS = 3
/** The demo "wall clock" when the clock starts, in Qatar time. */
export const ANCHOR_HOUR_QATAR = 8

export const DAY_MS = 86_400_000

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

/** Whole days between two instants (b - a). */
export function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / DAY_MS)
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "27 Oct 2026, 09:00 Qatar time". Used in notification copy (seeded and live). */
export function formatQatarDateTime(date: Date): string {
  const shifted = new Date(date.getTime() + QATAR_UTC_OFFSET_HOURS * 3_600_000)
  const hh = String(shifted.getUTCHours()).padStart(2, '0')
  const mm = String(shifted.getUTCMinutes()).padStart(2, '0')
  return `${shifted.getUTCDate()} ${MONTHS[shifted.getUTCMonth()]} ${shifted.getUTCFullYear()}, ${hh}:${mm} Qatar time`
}
