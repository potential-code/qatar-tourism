import { qatarDate, qatarDateTime, qatarTime } from '@/lib/format/qatar-time'

/** Management screens show a placeholder where a date was never recorded. */
const NOT_RECORDED = 'Not recorded'

export const qDate = (value: string | null | undefined) => qatarDate(value) || NOT_RECORDED

export const qDateTime = (value: string | null | undefined) =>
  qatarDateTime(value, { label: false }) || NOT_RECORDED

export const qTime = (value: string) => qatarTime(value)

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

/** "guest_services" to "Guest services". */
export function humanise(value: string | null | undefined): string {
  if (!value) return 'Not set'
  const spaced = value.replace(/[_-]+/g, ' ').trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

export const plural = (n: number, one: string, many = `${one}s`) =>
  `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`
