export function ping() {
  return { module: 'courses' as const, status: 'ok' as const }
}
