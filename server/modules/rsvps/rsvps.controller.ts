export function ping() {
  return { module: 'rsvps' as const, status: 'ok' as const }
}
