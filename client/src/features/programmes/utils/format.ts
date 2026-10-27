import {
  qatarDateParts,
  qatarDateShort,
  qatarTimeRange,
  qatarWeekdayLong,
} from '@/lib/format/qatar-time'

export { QATAR_TIME_LABEL } from '@/lib/format/qatar-time'

/** "Tue 29 Oct", or "Tuesday 29 October" when `long`, in Qatar time. */
export const sessionDay = (iso: string, long = false) =>
  long ? qatarWeekdayLong(iso) : qatarDateShort(iso)

/** "09:00 to 10:00" in Qatar time. */
export const sessionTimeRange = qatarTimeRange

/** Calendar chip parts: weekday, day number and month in Qatar time. */
export const dateChip = qatarDateParts

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
