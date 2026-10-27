const QATAR = 'Asia/Qatar'

/** "1 h 20 min", "45 min". */
export function minutesLabel(minutes: number): string {
  if (minutes <= 0) return '0 min'
  const hours = Math.floor(minutes / 60)
  const rest = Math.round(minutes % 60)
  if (hours === 0) return `${rest} min`
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

/** A calendar date in Qatar time, e.g. "27 Oct 2026". */
export function qatarDate(iso: string | null | undefined, month: 'short' | 'long' = 'short') {
  if (!iso) return ''
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month,
    year: 'numeric',
    timeZone: QATAR,
  }).format(new Date(iso))
}

/** "27 Oct, 14:05" in Qatar time. */
export function qatarDateTime(iso: string | null | undefined) {
  if (!iso) return ''
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: QATAR,
  }).format(new Date(iso))
}

export const PROGRAMME_LABEL = { A: 'Program A', B: 'Program B', C: 'Program C' } as const
