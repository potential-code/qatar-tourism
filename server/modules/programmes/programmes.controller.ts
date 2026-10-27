export function ping() {
  return { module: 'programmes' as const, status: 'ok' as const }
}
