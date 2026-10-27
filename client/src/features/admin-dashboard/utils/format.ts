/** Formatting for the admin workspace. Times are shown in Qatar time, labelled as such. */

export const QATAR_TZ = 'Asia/Qatar'

export const count = (value: number) => value.toLocaleString('en-GB')

export const percent = (value: number) =>
  `${value.toLocaleString('en-GB', { maximumFractionDigits: 1 })}%`

export const signed = (value: number) =>
  `${value > 0 ? '+' : ''}${value.toLocaleString('en-GB', { maximumFractionDigits: 1 })}`

export function qatarDateTime(iso: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: QATAR_TZ,
  }).format(new Date(iso))
}

export function qatarDate(iso: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: QATAR_TZ,
  }).format(new Date(iso))
}

export function qatarTime(iso: string) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: QATAR_TZ,
  }).format(new Date(iso))
}

/** "27 Oct 2026" from a YYYY-MM-DD reporting date. */
export function calendarDate(day: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${day}T12:00:00Z`))
}
