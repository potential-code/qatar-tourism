const qatar = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Qatar',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const qatarDay = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Qatar',
  day: 'numeric',
  month: 'short',
})

/** "27 Oct 2026, 09:14 Qatar time" (conventions: always label Qatar time). */
export function qatarTime(iso: string): string {
  return `${qatar.format(new Date(iso))} Qatar time`
}

/** "27 Oct", for compact lists where the full time sits in a tooltip. */
export function qatarDate(iso: string): string {
  return qatarDay.format(new Date(iso))
}
