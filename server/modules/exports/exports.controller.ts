export function ping() {
  return { module: 'exports' as const, status: 'ok' as const }
}
