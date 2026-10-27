export function ping() {
  return { module: 'profiles' as const, status: 'ok' as const }
}
