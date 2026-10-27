/**
 * The one place dates and times are formatted for display (CONVENTIONS: stored in UTC, shown in
 * Asia/Qatar with a "Qatar time" label). Qatar has no daylight saving, so UTC+3 all year.
 * Brief §6, §10: the default timezone is Asia/Qatar; learner-local time is a secondary hint.
 */
export const QATAR_TZ = 'Asia/Qatar'
export const QATAR_TIME_LABEL = 'Qatar time'
const LOCALE = 'en-GB'

type Instant = string | Date
type MaybeInstant = Instant | null | undefined

const cache = new Map<string, Intl.DateTimeFormat>()
function fmt(options: Intl.DateTimeFormatOptions, timeZone = QATAR_TZ) {
  const key = `${timeZone}|${JSON.stringify(options)}`
  let formatter = cache.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(LOCALE, { timeZone, ...options })
    cache.set(key, formatter)
  }
  return formatter
}

const toDate = (value: Instant) => (typeof value === 'string' ? new Date(value) : value)

/** "09:00" */
export const qatarTime = (iso: Instant) =>
  fmt({ hour: '2-digit', minute: '2-digit', hour12: false }).format(toDate(iso))

/** "27 Oct 2026"; `month: 'long'` gives "27 October 2026", `year: false` gives "27 Oct". */
export function qatarDate(
  iso: MaybeInstant,
  { month = 'short', year = true }: { month?: 'short' | 'long'; year?: boolean } = {},
) {
  if (!iso) return ''
  return fmt({ day: 'numeric', month, ...(year ? { year: 'numeric' } : {}) }).format(toDate(iso))
}

/**
 * "27 Oct 2026, 09:00 Qatar time". `year: false` drops the year; `label: false` drops the
 * "Qatar time" label where a heading or column already states it.
 */
export function qatarDateTime(
  iso: MaybeInstant,
  { year = true, label = true }: { year?: boolean; label?: boolean } = {},
) {
  if (!iso) return ''
  const text = `${qatarDate(iso, { year })}, ${qatarTime(iso)}`
  return label ? `${text} ${QATAR_TIME_LABEL}` : text
}

/** "Tuesday 27 October 2026" */
export const qatarDateLong = (iso: Instant) =>
  fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(toDate(iso))

/** "Tuesday 27 October" */
export const qatarWeekdayLong = (iso: Instant) =>
  fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(toDate(iso))

/** "Tue 27 Oct" */
export const qatarDateShort = (iso: Instant) =>
  fmt({ weekday: 'short', day: 'numeric', month: 'short' }).format(toDate(iso))

export const qatarDay = (iso: Instant) => fmt({ day: 'numeric' }).format(toDate(iso))
export const qatarMonth = (iso: Instant) => fmt({ month: 'short' }).format(toDate(iso))
export const qatarWeekday = (iso: Instant) => fmt({ weekday: 'short' }).format(toDate(iso))

/** Calendar chip parts: weekday, day number and month in Qatar time. */
export function qatarDateParts(iso: Instant) {
  return { weekday: qatarWeekday(iso), day: qatarDay(iso), month: qatarMonth(iso) }
}

/** "Tue 29 Oct, 09:00 to 10:00 Qatar time" */
export function qatarRange(startIso: Instant, endIso: Instant) {
  return `${qatarDateShort(startIso)}, ${qatarTime(startIso)} to ${qatarTime(endIso)} ${QATAR_TIME_LABEL}`
}

/** "09:00 to 10:00" */
export const qatarTimeRange = (startIso: Instant, endIso: Instant) =>
  `${qatarTime(startIso)} to ${qatarTime(endIso)}`

/** YYYY-MM-DD of the instant in Qatar. */
export function qatarDateKey(iso: Instant) {
  const parts = fmt({ year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(
    toDate(iso),
  )
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** UTC ISO instant of a Qatar wall-clock date and time. */
export function qatarToIso(date: string, hhmm: string) {
  return new Date(`${date}T${hhmm}:00+03:00`).toISOString()
}

/** The viewer's own zone, when it differs from Qatar; null when they are the same. */
export function learnerLocal(iso: string): string | null {
  const local = Intl.DateTimeFormat().resolvedOptions().timeZone
  const d = new Date(iso)
  const localTime = fmt({ hour: '2-digit', minute: '2-digit', hour12: false }, local).format(d)
  if (localTime === qatarTime(iso)) return null
  return `${fmt({ weekday: 'short', day: 'numeric', month: 'short' }, local).format(d)}, ${localTime} your time`
}

/** "In 2 days", "In 5 hours", "Started" relative to the demo clock. */
export function relativeTo(iso: string, nowIso: string) {
  const ms = new Date(iso).getTime() - new Date(nowIso).getTime()
  if (ms <= 0) return 'Started'
  const hours = Math.round(ms / 3_600_000)
  if (hours < 24) return `In ${hours} hour${hours === 1 ? '' : 's'}`
  const days = Math.round(hours / 24)
  return `In ${days} day${days === 1 ? '' : 's'}`
}
