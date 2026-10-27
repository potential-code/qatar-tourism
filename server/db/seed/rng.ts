/**
 * Seeded pseudo-random numbers. Every call sequence is a pure function of the seed label, so
 * the same seed always produces the same dataset (brief §15: "Use deterministic seeds so reset
 * reproduces the same charts"). Streams are forked by label so adding a draw in one part of the
 * seed does not shift the numbers in another.
 */

/** xmur3 string hash: turns a label into a 32-bit seed. */
function hashLabel(label: string): number {
  let h = 1779033703 ^ label.length
  for (let i = 0; i < label.length; i++) {
    h = Math.imul(h ^ label.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  h ^= h >>> 16
  return h >>> 0
}

export class Rng {
  private state: number
  private readonly label: string

  constructor(label: string) {
    this.label = label
    this.state = hashLabel(label)
  }

  /** Independent stream derived from this one's label. */
  fork(name: string): Rng {
    return new Rng(`${this.label}/${name}`)
  }

  /** mulberry32: a float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0
    let t = this.state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /** Integer in [min, max], inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1))
  }

  float(min: number, max: number): number {
    return min + this.next() * (max - min)
  }

  chance(probability: number): boolean {
    return this.next() < probability
  }

  pick<T>(items: readonly T[]): T {
    const item = items[Math.floor(this.next() * items.length)]
    if (item === undefined) throw new Error('Rng.pick on an empty list')
    return item
  }

  /** Fisher–Yates; returns a new array. */
  shuffle<T>(items: readonly T[]): T[] {
    const out = [...items]
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1))
      const a = out[i] as T
      out[i] = out[j] as T
      out[j] = a
    }
    return out
  }

  weighted<T>(items: readonly (readonly [T, number])[]): T {
    const total = items.reduce((sum, [, weight]) => sum + weight, 0)
    let roll = this.next() * total
    for (const [item, weight] of items) {
      roll -= weight
      if (roll < 0) return item
    }
    const last = items.at(-1)
    if (!last) throw new Error('Rng.weighted on an empty list')
    return last[0]
  }

  /** `count` distinct items. */
  sample<T>(items: readonly T[], count: number): T[] {
    return this.shuffle(items).slice(0, count)
  }
}
