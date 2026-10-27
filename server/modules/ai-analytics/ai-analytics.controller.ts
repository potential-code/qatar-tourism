export function ping() {
  return { module: 'ai-analytics' as const, status: 'ok' as const }
}
