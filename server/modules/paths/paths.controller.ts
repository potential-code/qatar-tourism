export function ping() {
  return { module: 'paths' as const, status: 'ok' as const }
}
