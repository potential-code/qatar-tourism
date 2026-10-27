export function ping() {
  return { module: 'analytics' as const, status: 'ok' as const }
}
