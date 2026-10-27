export function ping() {
  return { module: 'scorm' as const, status: 'ok' as const }
}
