/**
 * Qatar time helpers (brief §6, §10: "Default timezone is Asia/Qatar; show learner-local time
 * as secondary"). Qatar has no daylight saving, so UTC+3 all year.
 */
export const QATAR_TZ = 'Asia/Qatar'
const LOCALE = 'en-GB'

const fmt = (options: Intl.DateTimeFormatOptions, timeZone = QATAR_TZ) =>
  new Intl.DateTimeFormat(LOCALE, { timeZone, ...options })

const dateLong = fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const dateShort = fmt({ weekday: 'short', day: 'numeric', month: 'short' })
const time = fmt({ hour: '2-digit', minute: '2-digit', hour12: false })
const dayNum = fmt({ day: 'numeric' })
const monthShort = fmt({ month: 'short' })
const weekdayShort = fmt({ weekday: 'short' })
const dateKeyFmt = fmt({ year: 'numeric', month: '2-digit', day: '2-digit' })

export const qatarDateLong = (iso: string) => dateLong.format(new Date(iso))
export const qatarDateShort = (iso: string) => dateShort.format(new Date(iso))
export const qatarTime = (iso: string) => time.format(new Date(iso))
export const qatarDay = (iso: string) => dayNum.format(new Date(iso))
export const qatarMonth = (iso: string) => monthShort.format(new Date(iso))
export const qatarWeekday = (iso: string) => weekdayShort.format(new Date(iso))

/** "Tue 29 Oct, 09:00 to 10:00 Qatar time" */
export function qatarRange(startIso: string, endIso: string) {
  return `${qatarDateShort(startIso)}, ${qatarTime(startIso)} to ${qatarTime(endIso)} Qatar time`
}

/** "29 Oct 2026, 09:00 Qatar time" */
export function qatarDateTime(iso: string) {
  return `${fmt({ day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))}, ${qatarTime(iso)} Qatar time`
}

/** YYYY-MM-DD of the instant in Qatar. */
export function qatarDateKey(iso: string | Date) {
  const parts = dateKeyFmt.formatToParts(typeof iso === 'string' ? new Date(iso) : iso)
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

/** "in 2 days", "in 5 hours", "started" relative to the demo clock. */
export function relativeTo(iso: string, nowIso: string) {
  const ms = new Date(iso).getTime() - new Date(nowIso).getTime()
  if (ms <= 0) return 'Started'
  const hours = Math.round(ms / 3_600_000)
  if (hours < 24) return `In ${hours} hour${hours === 1 ? '' : 's'}`
  const days = Math.round(hours / 24)
  return `In ${days} day${days === 1 ? '' : 's'}`
}
