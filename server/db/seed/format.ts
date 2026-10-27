const QATAR_OFFSET_MS = 3 * 3_600_000

/** "27 Oct 2026, 09:00" in Qatar time. Used in seeded notification copy. */
export function formatQatarDateTime(date: Date): string {
  const shifted = new Date(date.getTime() + QATAR_OFFSET_MS)
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  const day = shifted.getUTCDate()
  const month = months[shifted.getUTCMonth()]
  const year = shifted.getUTCFullYear()
  const hh = String(shifted.getUTCHours()).padStart(2, '0')
  const mm = String(shifted.getUTCMinutes()).padStart(2, '0')
  return `${day} ${month} ${year}, ${hh}:${mm} Qatar time`
}
