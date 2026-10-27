export function ping() {
  return { module: 'attendance' as const, status: 'ok' as const }
}
