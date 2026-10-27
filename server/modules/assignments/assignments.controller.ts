export function ping() {
  return { module: 'assignments' as const, status: 'ok' as const }
}
