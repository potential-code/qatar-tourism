export function secondsLabel(total: number): string {
  if (total <= 0) return '0 min'
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  if (minutes === 0) return `${seconds} s`
  return seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds} s`
}
