/** Qatar-time formatting for management screens (CONVENTIONS: times shown in Asia/Qatar). */
const TZ = 'Asia/Qatar'

export function qDate(value: string | null | undefined): string {
  if (!value) return 'Not recorded'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: TZ,
  }).format(new Date(value))
}

export function qDateTime(value: string | null | undefined): string {
  if (!value) return 'Not recorded'
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: TZ,
  }).format(new Date(value))
}

export function qTime(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: TZ,
  }).format(new Date(value))
}

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
