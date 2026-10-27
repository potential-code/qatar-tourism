/** Number formatting for the admin workspace. Dates and times: `@/lib/format/qatar-time`. */

export const count = (value: number) => value.toLocaleString('en-GB')

export const percent = (value: number) =>
  `${value.toLocaleString('en-GB', { maximumFractionDigits: 1 })}%`

export const signed = (value: number) =>
  `${value > 0 ? '+' : ''}${value.toLocaleString('en-GB', { maximumFractionDigits: 1 })}`

/** "27 Oct 2026" from a YYYY-MM-DD reporting date. */
export function calendarDate(day: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${day}T12:00:00Z`))
}
