import { addDays, dayOffsetAt, qatarInstant, resolveReferenceDate } from '@server/lib/clock'

/** Version of the dataset recipe. Bump it when the seed's output changes. */
export const SEED_VERSION = 'qta-demo-1.0'

const DAY_MS = 86_400_000
const WINDOW_START_MS = 30 * 60_000
const WINDOW_MS = 10.5 * 3_600_000

/** The seed reads its reference date here: env var, else today (Qatar). */
export function seedReferenceDate(override?: string): string {
  return resolveReferenceDate(override ?? (process.env.DEMO_REFERENCE_DATE || undefined))
}

/**
 * Date helpers bound to one reference date. Offsets are in days relative to the reference
 * date's start (00:00 Qatar). The demo "now" is 08:00 Qatar on the reference date, so
 * `past()` never returns an instant after it.
 */
export function calendar(referenceDate: string) {
  const start = qatarInstant(referenceDate, '00:00').getTime()
  const nowMs = qatarInstant(referenceDate, '08:00').getTime()
  return {
    referenceDate,
    start,
    nowMs,
    /** Day +N at HH:mm Qatar time (brief §16 offsets). */
    at: (offsetDays: number, time = '00:00') => dayOffsetAt(referenceDate, offsetDays, time),
    /**
     * A past instant `daysAgo` (fractional) before the demo "now", never in the future. The
     * time of day is folded into the Qatar working window (08:30 to 19:00): each 24 h cycle
     * ending at "now" is compressed in order, so whole-day boundaries (inactive for 14 days,
     * last 30 days) and the order of events never change, yet nothing lands overnight.
     */
    ago: (daysAgo: number) => {
      const raw = Math.min(nowMs - daysAgo * DAY_MS, nowMs - 60_000)
      const cycleStart = nowMs - Math.ceil((nowMs - raw) / DAY_MS) * DAY_MS
      const fraction = (raw - cycleStart) / DAY_MS
      return new Date(cycleStart + WINDOW_START_MS + fraction * WINDOW_MS)
    },
    /** The calendar date `days` away, as YYYY-MM-DD. */
    date: (days: number) => addDays(referenceDate, days),
    DAY_MS,
  }
}

export type Calendar = ReturnType<typeof calendar>
