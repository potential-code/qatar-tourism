import type { Competency } from '@shared/constants'
import {
  type AssessmentQuestion,
  BASELINE_QUESTIONS,
  COMPETENCY_LABELS,
  POST_QUESTIONS,
} from '@shared/content/assessments'

/**
 * Question banks per assessment kind (brief §8), formerly server/modules/assessments. Baseline
 * and post come from the shared starter bank; the Program A foundation quiz below is original
 * demo content on the Level 1 units, one item per competency. The UI only ever receives
 * `questionsFor` (no answer key).
 */

export const FOUNDATION_QUESTIONS: readonly AssessmentQuestion[] = [
  {
    competency: 'discover_needs',
    competencyLabel: COMPETENCY_LABELS.discover_needs,
    prompt: 'A couple asks what they should do this evening. What do you do first?',
    options: [
      { key: 'A', text: 'Recommend the place you personally like most' },
      { key: 'B', text: 'Ask what they enjoy and how much time they have' },
      { key: 'C', text: 'Hand them the full events listing' },
    ],
    correct: 'B',
  },
  {
    competency: 'verify_information',
    competencyLabel: COMPETENCY_LABELS.verify_information,
    prompt: 'A visitor asks whether a venue is open late tonight and you are not certain.',
    options: [
      { key: 'A', text: 'Say it usually is' },
      { key: 'B', text: 'Check the venue’s official listing before you answer' },
      { key: 'C', text: 'Tell them to go and see' },
    ],
    correct: 'B',
  },
  {
    competency: 'communicate_clearly',
    competencyLabel: COMPETENCY_LABELS.communicate_clearly,
    prompt: 'You are explaining a two-step route to a visitor who is new to the city.',
    options: [
      { key: 'A', text: 'Use local nicknames for the streets' },
      { key: 'B', text: 'Give one step at a time with a landmark, then check they can repeat it' },
      { key: 'C', text: 'Describe every possible route' },
    ],
    correct: 'B',
  },
  {
    competency: 'recover_service',
    competencyLabel: COMPETENCY_LABELS.recover_service,
    prompt: 'A visitor’s tour has been moved to tomorrow and they are upset.',
    options: [
      { key: 'A', text: 'Explain that the operator made the change, not you' },
      { key: 'B', text: 'Acknowledge the impact, then offer options you have confirmed' },
      { key: 'C', text: 'Promise a free upgrade to calm things down' },
    ],
    correct: 'B',
  },
  {
    competency: 'protect_information',
    competencyLabel: COMPETENCY_LABELS.protect_information,
    prompt: 'Someone at the desk asks which room another guest is staying in.',
    options: [
      { key: 'A', text: 'Tell them, as they seem to know the guest' },
      { key: 'B', text: 'Offer to pass on a message through the approved route' },
      { key: 'C', text: 'Show them the booking screen' },
    ],
    correct: 'B',
  },
]

export type AssessmentKind = 'pre' | 'post' | 'formative'

export const BANK: Record<AssessmentKind, readonly AssessmentQuestion[]> = {
  pre: BASELINE_QUESTIONS,
  post: POST_QUESTIONS,
  formative: FOUNDATION_QUESTIONS,
}

export function scoreSelections(
  kind: AssessmentKind,
  selected: Partial<Record<Competency, string>>,
): { total: number; byCompetency: Record<Competency, number> } {
  const byCompetency = {} as Record<Competency, number>
  let total = 0
  for (const question of BANK[kind]) {
    const points = selected[question.competency] === question.correct ? 20 : 0
    byCompetency[question.competency] = points
    total += points
  }
  return { total, byCompetency }
}

export function pointsFor(kind: AssessmentKind, competency: Competency, option: string): number {
  const question = BANK[kind].find((q) => q.competency === competency)
  return question && question.correct === option ? 20 : 0
}

/** Deterministic per-attempt shuffle (brief §8: shuffle answer order). */
function seededOrder(seed: string, length: number): number[] {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  const order = Array.from({ length }, (_, i) => i)
  for (let i = length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0
    const j = h % (i + 1)
    ;[order[i], order[j]] = [order[j] as number, order[i] as number]
  }
  return order
}

/** Questions for the browser: shuffled options, no answer key. */
export function questionsFor(kind: AssessmentKind, attemptId: string) {
  return BANK[kind].map((question) => {
    const order = seededOrder(`${attemptId}:${question.competency}`, question.options.length)
    return {
      competency: question.competency,
      competencyLabel: question.competencyLabel,
      prompt: question.prompt,
      options: order.map((index) => question.options[index] as { key: string; text: string }),
    }
  })
}
