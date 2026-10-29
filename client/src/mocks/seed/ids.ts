/**
 * cyrb128: a fast, non-cryptographic 128-bit string hash (four 32-bit lanes). Pure JS, so the
 * seed builds identically in the browser and under bun.
 */
function cyrb128(text: string): [number, number, number, number] {
  let h1 = 1779033703
  let h2 = 3144134277
  let h3 = 1013904242
  let h4 = 2773480762
  for (let i = 0; i < text.length; i++) {
    const k = text.charCodeAt(i)
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067)
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233)
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213)
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179)
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067)
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233)
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213)
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179)
  h1 ^= h2 ^ h3 ^ h4
  h2 ^= h1
  h3 ^= h1
  h4 ^= h1
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0]
}

const hex8 = (n: number) => n.toString(16).padStart(8, '0')

/**
 * Stable, deterministic identifiers. A UUID-shaped id derived from (namespace, key) is the same
 * on every run and every machine, so a reset recreates the very same IDs (brief §17: "Stable
 * IDs connect all records") and code, tests and bookmarks can rely on them.
 */
export function stableUuid(namespace: string, key: string | number): string {
  const hex = cyrb128(`qta-demo:${namespace}:${key}`).map(hex8).join('')
  const variant = ((Number.parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variant}${hex.slice(18, 20)}-${hex.slice(20, 32)}`
}

/** Account ids are text. These are readable and stable. */
export const userIds = {
  admin: 'user-admin',
  learner: (n: number) => `user-l${String(n).padStart(4, '0')}`,
  trainer: (n: number) => `user-t${String(n).padStart(2, '0')}`,
}

export const learnerCode = (n: number) => `L${String(n).padStart(4, '0')}`
export const trainerCode = (n: number) => `T${String(n).padStart(2, '0')}`
export const learnerEmail = (n: number) => `learner${String(n).padStart(4, '0')}@example.com`
export const trainerEmail = (n: number) => `trainer${String(n).padStart(2, '0')}@example.com`
