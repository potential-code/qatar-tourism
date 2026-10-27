export function ping() {
  return { module: 'certificates' as const, status: 'ok' as const }
}
