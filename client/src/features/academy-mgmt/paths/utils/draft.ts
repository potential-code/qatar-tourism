import type { PathItemKind } from '@shared/constants'
import type { DraftItem, PathItem } from '../types'

/** Pure helpers for the builder's local draft state. */

let counter = 0
const nextKey = () => {
  counter += 1
  return `item-${counter}`
}

export const toDraft = (items: readonly PathItem[]): DraftItem[] =>
  items.map(({ id: _id, position: _position, ...rest }) => ({ ...rest, key: nextKey() }))

export function newItem(partial: Omit<DraftItem, 'key'>): DraftItem {
  return { ...partial, key: nextKey() }
}

/** The PATCH body: the order of the array is the order of the path. */
export const toInput = (items: readonly DraftItem[]) =>
  items.map((item) => ({
    kind: item.kind,
    courseId: item.courseId,
    scenarioKey: item.scenarioKey,
    title: item.title,
    required: item.required,
    level: item.level,
    stage: item.stage,
    note: item.note,
  }))

const identity = (item: {
  kind: PathItemKind
  courseId: string | null
  scenarioKey: string | null
  title: string
}) => `${item.kind}|${item.courseId ?? ''}|${item.scenarioKey ?? ''}|${item.title}`

export type Change = {
  type: 'added' | 'removed' | 'changed' | 'moved'
  title: string
  detail?: string
}

/** Indices (into `seq`) of one longest increasing subsequence: the items that kept their order. */
function stableIndices(seq: readonly number[]): Set<number> {
  const tails: number[] = []
  const prev: number[] = new Array(seq.length).fill(-1)
  for (let i = 0; i < seq.length; i++) {
    let lo = 0
    let hi = tails.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if ((seq[tails[mid] as number] as number) < (seq[i] as number)) lo = mid + 1
      else hi = mid
    }
    if (lo > 0) prev[i] = tails[lo - 1] as number
    tails[lo] = i
  }
  const keep = new Set<number>()
  let at = tails.at(-1) ?? -1
  while (at >= 0) {
    keep.add(at)
    at = prev[at] as number
  }
  return keep
}

/** What a draft changes compared with the published version (shown before publishing). */
export function diffItems(published: readonly PathItem[], draft: readonly DraftItem[]): Change[] {
  const changes: Change[] = []
  const beforeIds = published.map(identity)
  const common: { item: DraftItem; beforeIndex: number }[] = []
  for (const item of draft) {
    const beforeIndex = beforeIds.indexOf(identity(item))
    if (beforeIndex === -1) {
      changes.push({ type: 'added', title: item.title })
      continue
    }
    common.push({ item, beforeIndex })
    const old = published[beforeIndex] as PathItem
    const diffs: string[] = []
    if (old.required !== item.required) diffs.push(item.required ? 'now required' : 'now optional')
    if (old.stage !== item.stage || old.level !== item.level)
      diffs.push(`moved to Level ${item.level}, ${item.stage}`)
    if ((old.note ?? '') !== (item.note ?? '')) diffs.push('note changed')
    if (diffs.length) changes.push({ type: 'changed', title: item.title, detail: diffs.join(', ') })
  }
  const kept = stableIndices(common.map((c) => c.beforeIndex))
  common.forEach((c, i) => {
    if (!kept.has(i)) changes.push({ type: 'moved', title: c.item.title, detail: 'order changed' })
  })
  for (const [index, item] of published.entries()) {
    if (!draft.some((d) => identity(d) === beforeIds[index]))
      changes.push({ type: 'removed', title: item.title })
  }
  return changes
}

/** Completion rule wording derived from the items (brief §14 "set completion rules"). */
export function completionRule(items: readonly DraftItem[]) {
  const required = items.filter((i) => i.required).length
  const optional = items.length - required
  return `Complete all ${required} required ${required === 1 ? 'item' : 'items'} in order of their gates${optional ? `; ${optional} optional ${optional === 1 ? 'item does' : 'items do'} not block completion` : ''}.`
}

export type StageGroup = { level: number; stage: string; items: DraftItem[] }

/** Consecutive items sharing a level and stage, as a learner sees them. */
export function groupStages<T extends { level: number; stage: string }>(items: readonly T[]) {
  const groups: { level: number; stage: string; items: T[] }[] = []
  for (const item of items) {
    const last = groups.at(-1)
    if (last && last.level === item.level && last.stage === item.stage) last.items.push(item)
    else groups.push({ level: item.level, stage: item.stage, items: [item] })
  }
  return groups
}
