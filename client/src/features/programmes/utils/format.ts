/**
 * Dates are stored in UTC and always shown in Qatar time with a "Qatar time" label
 * (docs/CONVENTIONS.md). Asia/Qatar has no daylight saving.
 */
const TIMEZONE = 'Asia/Qatar'
export const QATAR_TIME_LABEL = 'Qatar time'

const dayFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIMEZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})
const longDayFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIMEZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const timeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})
const partsFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIMEZONE,
  day: 'numeric',
  month: 'short',
  weekday: 'short',
})

export function sessionDay(iso: string, long = false): string {
  return (long ? longDayFormat : dayFormat).format(new Date(iso))
}

/** "09:00 to 10:00" in Qatar time. */
export function sessionTimeRange(startsAt: string, endsAt: string): string {
  return `${timeFormat.format(new Date(startsAt))} to ${timeFormat.format(new Date(endsAt))}`
}

/** Calendar chip parts: weekday, day number and month in Qatar time. */
export function dateChip(iso: string) {
  const parts = partsFormat.formatToParts(new Date(iso))
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  return { weekday: get('weekday'), day: get('day'), month: get('month') }
}

export function formatLabel(format: 'in_person' | 'online'): string {
  return format === 'in_person' ? 'In person' : 'Live online'
}

export function minutesLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} hour${hours > 1 ? 's' : ''}` : `${hours} h ${rest} min`
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
