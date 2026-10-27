import type { CriterionFeedback } from '@server/db/schema/roleplay'
import { ROLEPLAY_SCORING, type RolePlayCriterion } from '@shared/constants'
import type { RolePlayScenario } from '@shared/content/scenarios'
import {
  countQuestions,
  detect,
  firstSentenceWith,
  type SignalKey,
  sentences,
  wordCount,
} from './signals'

/**
 * Deterministic rubric scoring (brief §9). Five criteria scored 0–4 from the learner's own
 * words; total out of 20, shown out of 100. Every criterion carries one evidence excerpt from
 * the conversation and one concise improvement suggestion.
 *
 * Inputs are the learner's replies only. Accent, voice, name or any demographic
 * characteristic is never read, so it can never affect a score.
 */

export type ScoreResult = {
  criteria: CriterionFeedback[]
  scores: Record<RolePlayCriterion, number>
  total: number
  percent: number
  strength: string
  improve: string
  retry: string
}

const clamp = (n: number) => Math.max(0, Math.min(ROLEPLAY_SCORING.maxPerCriterion, n))

/** Evidence excerpt: one sentence, trimmed to a readable length. */
function excerpt(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > 160 ? `${clean.slice(0, 157).trimEnd()}...` : clean
}

type Draft = { score: number; evidence: string; suggestion: string; strength: string }

function countWith(turns: readonly string[], key: SignalKey): number {
  return turns.filter((turn) => detect(turn).has(key)).length
}

function evidenceOr(turns: readonly string[], keys: SignalKey[], fallback: string): string {
  for (const key of keys) {
    const hit = firstSentenceWith(turns, key)
    if (hit) return excerpt(hit)
  }
  return excerpt(fallback)
}

function empathy(turns: readonly string[]): Draft {
  const first = turns[0] ?? ''
  const firstSignals = detect(first)
  let score = 0
  if (countWith(turns, 'acknowledge') > 0) score += 2
  if (firstSignals.has('acknowledge')) score += 1
  if (countWith(turns, 'polite') > 0) score += 1
  if (countWith(turns, 'dismissive') > 0) score -= 3
  const dismissive = firstSentenceWith(turns, 'dismissive')
  return {
    score: clamp(score),
    evidence: dismissive
      ? excerpt(dismissive)
      : evidenceOr(turns, ['acknowledge', 'polite'], first),
    suggestion:
      score >= 4
        ? 'Keep naming the visitor’s feeling before you move to solutions.'
        : firstSignals.has('acknowledge')
          ? 'Add a courteous phrase such as “thank you for telling me” as the conversation goes on.'
          : 'Open by acknowledging how the visitor feels before you ask or explain anything.',
    strength: 'You acknowledged the visitor’s feelings and stayed courteous.',
  }
}

function discovery(turns: readonly string[]): Draft {
  const questions = countQuestions(turns)
  const firstAsks = detect(turns[0] ?? '').has('question')
  const score = Math.min(3, questions) + (firstAsks ? 1 : 0)
  return {
    score: clamp(score),
    evidence: evidenceOr(turns, ['question'], turns[0] ?? ''),
    suggestion:
      questions === 0
        ? 'Ask at least one open question about the visitor’s needs before offering anything.'
        : firstAsks
          ? 'Follow up with one question about timing or constraints before presenting options.'
          : 'Ask your first question earlier, before you suggest a solution.',
    strength: 'You asked useful questions to understand the visitor’s situation.',
  }
}

function clarity(turns: readonly string[]): Draft {
  const all = turns.flatMap(sentences)
  const avgWords = all.length ? all.reduce((sum, s) => sum + wordCount(s), 0) / all.length : 0
  const longest = turns.reduce((max, turn) => Math.max(max, wordCount(turn)), 0)
  let score = 0
  if (avgWords >= 5 && avgWords <= 24) score += 1
  if (longest <= 70) score += 1
  if (countWith(turns, 'sequence') > 0) score += 1
  if (countWith(turns, 'checkUnderstanding') > 0) score += 1
  if (all.length === 0) score = 0
  const longTurn = turns.find((turn) => wordCount(turn) > 70)
  return {
    score: clamp(score),
    evidence: longTurn
      ? excerpt(sentences(longTurn)[0] ?? longTurn)
      : evidenceOr(turns, ['checkUnderstanding', 'sequence'], turns[1] ?? turns[0] ?? ''),
    suggestion:
      countWith(turns, 'checkUnderstanding') === 0
        ? 'Check understanding, for example “Does that work for you?”, before you close.'
        : longest > 70
          ? 'Keep each reply short: one idea per sentence, in plain language.'
          : 'Use clear steps such as “first” and “then” when you explain what happens next.',
    strength: 'You explained things in plain language and checked understanding.',
  }
}

function accuracy(turns: readonly string[]): Draft {
  const overpromise = firstSentenceWith(turns, 'overpromise')
  const personal = firstSentenceWith(turns, 'personalData')
  let score = 0
  if (countWith(turns, 'verify') > 0) score += 2
  if (countWith(turns, 'policy') > 0 || countWith(turns, 'verify') > 1) score += 1
  if (!overpromise) score += 1
  if (overpromise) score -= 1
  if (personal) score -= 1
  return {
    score: clamp(score),
    evidence: overpromise
      ? excerpt(overpromise)
      : personal
        ? excerpt(personal)
        : evidenceOr(turns, ['verify', 'policy'], turns[1] ?? turns[0] ?? ''),
    suggestion: overpromise
      ? 'Verify availability before promising an alternative, and do not invent exceptions.'
      : personal
        ? 'Only ask for the information you need; avoid identity or personal details.'
        : countWith(turns, 'verify') === 0
          ? 'Say how you will verify information from an authorised source before confirming.'
          : 'Keep naming the source or person you will check with, so the visitor can trust it.',
    strength: 'You verified information instead of guessing or overpromising.',
  }
}

function solution(turns: readonly string[]): Draft {
  const optionTurns = countWith(turns, 'options')
  const followUp = countWith(turns, 'followUp')
  const last = turns[turns.length - 1] ?? ''
  let score = 0
  if (optionTurns > 0) score += 1
  if (optionTurns > 1 || /\b(two|both|either)\b/i.test(turns.join(' '))) score += 1
  if (followUp > 0) score += 1
  if (detect(last).has('followUp') || detect(last).has('checkUnderstanding')) score += 1
  return {
    score: clamp(score),
    evidence: evidenceOr(turns, ['followUp', 'options'], last),
    suggestion:
      optionTurns === 0
        ? 'Offer two feasible options so the visitor can choose.'
        : followUp === 0
          ? 'Close with a clear next step: who will do what, and by when.'
          : 'Confirm the agreed next step in your final reply.',
    strength: 'You offered options and agreed a clear next step.',
  }
}

const RETRY_TIPS: Record<RolePlayCriterion, (scenario: RolePlayScenario) => string> = {
  empathy_professionalism: () => 'Start with one sentence that names how the visitor feels.',
  discovery_questions: (s) =>
    s.key === 'unclear-directions'
      ? 'Ask what the visitor can see around them before giving directions.'
      : 'Ask one question about timing before presenting options.',
  clarity: () => 'Give at most three short steps, then ask the visitor to repeat them back.',
  accuracy_boundaries: (s) =>
    s.key === 'group-running-late'
      ? 'Explain the stated demo policy and escalate instead of promising an exception.'
      : 'Check with an authorised source before you confirm anything.',
  solution_followthrough: () => 'End by confirming who will follow up, how, and by when.',
}

const ORDER: RolePlayCriterion[] = [
  'empathy_professionalism',
  'discovery_questions',
  'clarity',
  'accuracy_boundaries',
  'solution_followthrough',
]

export function scoreConversation(
  scenario: RolePlayScenario,
  learnerTurns: readonly string[],
): ScoreResult {
  const turns = learnerTurns.map((turn) => turn.trim()).filter(Boolean)
  const drafts: Record<RolePlayCriterion, Draft> = {
    empathy_professionalism: empathy(turns),
    discovery_questions: discovery(turns),
    clarity: clarity(turns),
    accuracy_boundaries: accuracy(turns),
    solution_followthrough: solution(turns),
  }

  const criteria = ORDER.map((key) => ({
    key,
    score: drafts[key].score,
    evidence: drafts[key].evidence,
    suggestion: drafts[key].suggestion,
  }))
  const scores = Object.fromEntries(ORDER.map((key) => [key, drafts[key].score])) as Record<
    RolePlayCriterion,
    number
  >
  const total = criteria.reduce((sum, c) => sum + c.score, 0)

  // Highest and lowest criterion, ties resolved by rubric order so the result is stable.
  const best = ORDER.reduce((a, b) => (scores[b] > scores[a] ? b : a))
  const weakest = ORDER.reduce((a, b) => (scores[b] < scores[a] ? b : a))

  return {
    criteria,
    scores,
    total,
    percent: Math.round((total / ROLEPLAY_SCORING.maxTotal) * 100),
    strength:
      scores[best] >= 2
        ? drafts[best].strength
        : 'You completed every turn of the conversation, which gives you a baseline to build on.',
    improve: drafts[weakest].suggestion,
    retry: RETRY_TIPS[weakest](scenario),
  }
}
