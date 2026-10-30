import type { Competency, ContentLanguage } from '@shared/constants'
import { COMPETENCIES } from '@shared/constants'
import type { DrawRule, QuestionBankRow } from '@shared/types/db'
import { seededOrder } from './bank'

/**
 * Pure question drawing and scoring for the rules engine (SPEC §6). No database access, so the
 * seed, the services and the tests share one implementation. A draw is deterministic for a seed:
 * the same seed always gives the same questions in the same order; a new attempt gets a new seed.
 */

export const DEFAULT_LANGUAGE: ContentLanguage = 'en'

function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0
  return h
}

/** The newest published version of each question variant: the ones a draw may use. */
export function activeRows(bank: readonly QuestionBankRow[]): QuestionBankRow[] {
  const best = new Map<string, QuestionBankRow>()
  for (const row of bank) {
    if (row.status !== 'published') continue
    const current = best.get(row.questionId)
    if (!current || row.version > current.version) best.set(row.questionId, row)
  }
  return [...best.values()]
}

const inProgramme = (row: QuestionBankRow, programme: 'A' | 'B') =>
  row.programme === 'all' || row.programme === programme

/** One shared item with the variants available in each language. */
export interface SharedItem {
  sharedId: string
  competency: Competency
  difficulty: QuestionBankRow['difficulty']
  variants: Partial<Record<ContentLanguage, QuestionBankRow>>
}

export function sharedItems(
  bank: readonly QuestionBankRow[],
  programme: 'A' | 'B',
): Map<string, SharedItem> {
  const items = new Map<string, SharedItem>()
  for (const row of activeRows(bank)) {
    if (!inProgramme(row, programme)) continue
    const item = items.get(row.sharedId) ?? {
      sharedId: row.sharedId,
      competency: row.competency,
      difficulty: row.difficulty,
      variants: {},
    }
    item.variants[row.language] = row
    items.set(row.sharedId, item)
  }
  return items
}

/** How many shared items could satisfy one draw rule (the pool the builder reports). */
export function poolSize(
  bank: readonly QuestionBankRow[],
  programme: 'A' | 'B',
  rule: Pick<DrawRule, 'competency' | 'difficulty'>,
): number {
  return [...sharedItems(bank, programme).values()].filter(
    (item) =>
      item.competency === rule.competency &&
      (rule.difficulty === 'any' || item.difficulty === rule.difficulty),
  ).length
}

export interface DrawInput {
  bank: readonly QuestionBankRow[]
  programme: 'A' | 'B'
  draws: readonly DrawRule[]
  randomiseQuestions: boolean
  seed: string
  /** Shared ids this learner has already seen; a draw prefers items outside it. */
  avoid?: ReadonlySet<string>
}

export interface DrawResult {
  items: SharedItem[]
  /** Draw rules the pool could not fully satisfy: what was asked and what was available. */
  shortfalls: { rule: DrawRule; available: number }[]
}

/** Picks the shared items the rule asks for, then orders them. */
export function drawItems(input: DrawInput): DrawResult {
  const pool = sharedItems(input.bank, input.programme)
  const chosen: SharedItem[] = []
  const taken = new Set<string>()
  const shortfalls: DrawResult['shortfalls'] = []
  for (const rule of input.draws) {
    const candidates = [...pool.values()]
      .filter(
        (item) =>
          !taken.has(item.sharedId) &&
          item.competency === rule.competency &&
          (rule.difficulty === 'any' || item.difficulty === rule.difficulty),
      )
      .sort((a, b) => {
        const seenA = input.avoid?.has(a.sharedId) ? 1 : 0
        const seenB = input.avoid?.has(b.sharedId) ? 1 : 0
        if (seenA !== seenB) return seenA - seenB
        return hash(`${input.seed}:${a.sharedId}`) - hash(`${input.seed}:${b.sharedId}`)
      })
    const picked = candidates.slice(0, rule.count)
    if (picked.length < rule.count) shortfalls.push({ rule, available: candidates.length })
    for (const item of picked) {
      chosen.push(item)
      taken.add(item.sharedId)
    }
  }
  if (!input.randomiseQuestions) return { items: chosen, shortfalls }
  const order = seededOrder(`${input.seed}:order`, chosen.length)
  return { items: order.map((i) => chosen[i] as SharedItem), shortfalls }
}

/** The variant to serve: the learner's language, falling back to English, then any variant. */
export function pickVariant(item: SharedItem, language: ContentLanguage): QuestionBankRow | null {
  return (
    item.variants[language] ??
    item.variants[DEFAULT_LANGUAGE] ??
    Object.values(item.variants)[0] ??
    null
  )
}

/** Option keys in the order shown. Fixed order when the rule does not randomise options. */
export function optionOrderFor(
  row: Pick<QuestionBankRow, 'options'>,
  seed: string,
  randomise: boolean,
): string[] {
  const keys = row.options.map((o) => o.key)
  if (!randomise) return keys
  return seededOrder(seed, keys.length).map((i) => keys[i] as string)
}

export const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|')

export interface Scored {
  /** 0 to 100, over the points of every question in the attempt (unanswered earn nothing). */
  score: number
  earned: number
  possible: number
  /** Per competency, on the 0 to 20 scale the reports and the AI path generator read. */
  byCompetency: Partial<Record<Competency, number>>
  /** Per competency detail for the result screen. */
  detail: Record<Competency, { earned: number; possible: number; correct: number; total: number }>
}

export interface ScoreItem {
  question: Pick<QuestionBankRow, 'competency' | 'points' | 'correct'>
  selected: readonly string[]
}

/** All-or-nothing per question: the selected options must equal the correct options. */
export function scoreItems(items: readonly ScoreItem[]): Scored {
  const detail = Object.fromEntries(
    COMPETENCIES.map((c) => [c, { earned: 0, possible: 0, correct: 0, total: 0 }]),
  ) as Scored['detail']
  let earned = 0
  let possible = 0
  for (const { question, selected } of items) {
    const d = detail[question.competency]
    d.possible += question.points
    d.total += 1
    possible += question.points
    if (selected.length > 0 && sameSet(selected, question.correct)) {
      d.earned += question.points
      d.correct += 1
      earned += question.points
    }
  }
  const byCompetency: Scored['byCompetency'] = {}
  for (const c of COMPETENCIES) {
    const d = detail[c]
    if (d.possible > 0) byCompetency[c] = Math.round((20 * d.earned) / d.possible)
  }
  return {
    score: possible === 0 ? 0 : Math.round((100 * earned) / possible),
    earned,
    possible,
    byCompetency,
    detail,
  }
}
