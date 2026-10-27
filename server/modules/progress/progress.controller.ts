export function ping() {
  return { module: 'progress' as const, status: 'ok' as const }
}
