export function ping() {
  return { module: 'assessments' as const, status: 'ok' as const }
}
