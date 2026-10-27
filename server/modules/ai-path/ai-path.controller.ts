export function ping() {
  return { module: 'ai-path' as const, status: 'ok' as const }
}
