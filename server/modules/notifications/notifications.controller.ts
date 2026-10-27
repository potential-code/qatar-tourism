export function ping() {
  return { module: 'notifications' as const, status: 'ok' as const }
}
