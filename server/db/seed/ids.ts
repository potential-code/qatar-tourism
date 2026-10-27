/**
 * Stable, deterministic identifiers. A UUID derived from (namespace, key) is the same on every
 * run and every machine, so a reset recreates the very same IDs (brief §17: "Stable IDs connect
 * all records") and the Phase 2 code, tests and bookmarks can rely on them.
 */
export function stableUuid(namespace: string, key: string | number): string {
  const hasher = new Bun.CryptoHasher('sha1')
  hasher.update(`qta-demo:${namespace}:${key}`)
  const hex = hasher.digest('hex')
  const variant = ((Number.parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variant}${hex.slice(18, 20)}-${hex.slice(20, 32)}`
}

/** Better Auth user IDs are text. These are readable and stable. */
export const userIds = {
  admin: 'user-admin',
  learner: (n: number) => `user-l${String(n).padStart(4, '0')}`,
  trainer: (n: number) => `user-t${String(n).padStart(2, '0')}`,
}

export const learnerCode = (n: number) => `L${String(n).padStart(4, '0')}`
export const trainerCode = (n: number) => `T${String(n).padStart(2, '0')}`
export const learnerEmail = (n: number) => `learner${String(n).padStart(4, '0')}@example.com`
export const trainerEmail = (n: number) => `trainer${String(n).padStart(2, '0')}@example.com`
