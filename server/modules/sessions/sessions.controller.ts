export function ping() {
  return { module: 'sessions' as const, status: 'ok' as const }
}
