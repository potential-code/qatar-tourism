export function ping() {
  return { module: 'organisations' as const, status: 'ok' as const }
}
