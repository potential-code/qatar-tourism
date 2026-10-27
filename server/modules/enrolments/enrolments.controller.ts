export function ping() {
  return { module: 'enrolments' as const, status: 'ok' as const }
}
