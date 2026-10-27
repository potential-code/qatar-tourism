export function ping() {
  return { module: 'reports' as const, status: 'ok' as const }
}
