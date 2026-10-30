import { COMPETENCIES, type Competency } from '@shared/constants'
import type {
  AssessmentAnswerRow,
  AssessmentAttemptRow,
  AssessmentRuleRow,
  DrawRule,
  QuestionBankRow,
} from '@shared/types/db'
import {
  drawItems,
  optionOrderFor,
  pickVariant,
  type ScoreItem,
  scoreItems,
} from '../../services/assessments/draw'
import { POINTS_BY_TYPE, QUESTION_CONTENT } from '../../services/assessments/question-content'
import { stableUuid } from './ids'
import type { Calendar } from './reference-date'
import type { SeedRow } from './rows'

type QuestionInsert = SeedRow<'questionBank'>
type RuleInsert = SeedRow<'assessmentRules'>

/**
 * The 24 original questions, each with a linked English and Arabic variant (same `sharedId`),
 * so 48 published rows (SPEC §6). Authored in `services/assessments/question-content.ts`.
 * Easy items feed the Pre diagnostic, medium and hard items feed the Post, so the two never
 * repeat a question and every competency is measured by both.
 */
export function buildQuestionBank(cal: Calendar): QuestionInsert[] {
  const created = cal.ago(100)
  return QUESTION_CONTENT.flatMap((item) =>
    (['en', 'ar'] as const).map((language): QuestionInsert => {
      const questionId = `Q-${item.code}-${language.toUpperCase()}`
      const text = item[language]
      return {
        id: stableUuid('question', questionId),
        questionId,
        sharedId: `QS-${item.code}`,
        competency: item.competency,
        programme: 'all',
        difficulty: item.difficulty,
        language,
        type: item.type,
        prompt: text.prompt,
        options: text.options.map((option, index) => ({
          key: String.fromCharCode(65 + index),
          text: option,
        })),
        correct: [...item.correct],
        feedback: text.feedback,
        points: POINTS_BY_TYPE[item.type],
        version: 1,
        status: 'published',
        createdAt: created,
        updatedAt: created,
      }
    }),
  )
}

/** One easy question per competency for the Pre; one medium and one hard for the Post. */
const PRE_DRAWS: DrawRule[] = COMPETENCIES.map((competency) => ({
  competency,
  difficulty: 'easy',
  count: 1,
}))
const POST_DRAWS: DrawRule[] = COMPETENCIES.flatMap((competency) => [
  { competency, difficulty: 'medium' as const, count: 1 },
  { competency, difficulty: 'hard' as const, count: 1 },
])

/**
 * Pre and post rules per programme (SPEC §6). Pre: five diagnostic questions, one scored
 * attempt, no pass gate. Post: ten questions across the same competencies, 80 percent, two
 * attempts, best score counts, 15 minutes, randomised per new attempt. Program B's post score
 * never blocks completion (that is a programme rule, not an assessment rule).
 */
export function buildAssessmentRules(
  cal: Calendar,
  assessments: { pre: string; post: string },
): RuleInsert[] {
  const created = cal.ago(100)
  const rule = (kind: 'pre' | 'post', programme: 'A' | 'B'): RuleInsert => {
    const draws = kind === 'pre' ? PRE_DRAWS : POST_DRAWS
    return {
      id: stableUuid('assessment-rule', `${kind}:${programme}:1`),
      kind,
      programme,
      assessmentId: kind === 'pre' ? assessments.pre : assessments.post,
      drawCount: draws.reduce((sum, d) => sum + d.count, 0),
      draws: draws.map((d) => ({ ...d })),
      randomiseQuestions: true,
      randomiseOptions: true,
      passPercent: kind === 'pre' ? null : 80,
      attemptLimit: kind === 'pre' ? 1 : 2,
      timeLimitMinutes: kind === 'pre' ? null : 15,
      feedbackRelease: 'after_submission',
      scorePolicy: 'best',
      version: 1,
      status: 'published',
      createdAt: created,
      updatedAt: created,
    }
  }
  return [rule('pre', 'A'), rule('post', 'A'), rule('pre', 'B'), rule('post', 'B')]
}

/**
 * The seeded demonstration of improvement: this Program A learner has a 50 percent baseline and
 * an 80 percent post-assessment, both taken through the rules engine (so the attempt detail shows
 * a real snapshot), giving "Improvement: 30 percentage points" with competency results.
 */
export const IMPROVEMENT_DEMO_LEARNER = 'user-l0022'

/** A selection that earns nothing: an option that is not correct, never the whole correct set. */
function wrongSelection(question: QuestionBankRow): string[] {
  const wrong = question.options.find((o) => !question.correct.includes(o.key))
  return wrong ? [wrong.key] : []
}

/**
 * Chooses which questions to miss so the attempt scores exactly `target` percent. Tries every
 * subset (the sets are 5 and 10 questions) and keeps the one that misses the fewest questions.
 */
function selectionsForScore(questions: readonly QuestionBankRow[], target: number): string[][] {
  let bestMask = 0
  let bestMissed = Number.POSITIVE_INFINITY
  for (let mask = 0; mask < 1 << questions.length; mask++) {
    const items: ScoreItem[] = questions.map((question, i) => ({
      question,
      selected: mask & (1 << i) ? [] : question.correct,
    }))
    if (scoreItems(items).score !== target) continue
    const missed = items.filter((it) => it.selected.length === 0).length
    if (missed < bestMissed) {
      bestMissed = missed
      bestMask = mask
    }
  }
  return questions.map((question, i) =>
    bestMask & (1 << i) ? wrongSelection(question) : [...question.correct],
  )
}

export interface DemoTables {
  enrolments: { id: string; learnerId: string; programmeId: string }[]
  programmes: { id: string; code: string }[]
  assessments: { id: string; kind: string }[]
  assessmentAttempts: AssessmentAttemptRow[]
  assessmentAnswers: AssessmentAnswerRow[]
  questionBank: QuestionBankRow[]
  assessmentRules: AssessmentRuleRow[]
}

/** Replaces one learner's seeded pre and post attempts with rules-engine attempts. */
export function applyAssessmentDemo(tables: DemoTables): void {
  const programmeA = tables.programmes.find((p) => p.code === 'A')
  const enrolment = tables.enrolments.find(
    (e) => e.learnerId === IMPROVEMENT_DEMO_LEARNER && e.programmeId === programmeA?.id,
  )
  if (!enrolment) return
  const convert = (kind: 'pre' | 'post', target: number) => {
    const assessment = tables.assessments.find((a) => a.kind === kind)
    const rule = tables.assessmentRules.find((r) => r.kind === kind && r.programme === 'A')
    const attempt = tables.assessmentAttempts.find(
      (a) => a.enrolmentId === enrolment.id && a.assessmentId === assessment?.id,
    )
    if (!assessment || !rule || !attempt) return
    // Some draws cannot reach the target exactly (point weights), so try the next draw.
    let seed = ''
    let rows: QuestionBankRow[] = []
    let picks: string[][] = []
    let scored = scoreItems([])
    for (let n = 0; n < 200; n++) {
      seed = `seed:${enrolment.id}:${kind}:1:${n}`
      const drawn = drawItems({
        bank: tables.questionBank,
        programme: 'A',
        draws: rule.draws,
        randomiseQuestions: rule.randomiseQuestions,
        seed,
      })
      rows = drawn.items.flatMap((item) => {
        const row = pickVariant(item, 'en')
        return row ? [row] : []
      })
      picks = selectionsForScore(rows, target)
      scored = scoreItems(rows.map((question, i) => ({ question, selected: picks[i] ?? [] })))
      if (scored.score === target) break
    }

    attempt.score = scored.score
    attempt.competencyScores = scored.byCompetency as Record<Competency, number>
    attempt.ruleId = rule.id
    attempt.ruleVersion = rule.version
    attempt.snapshot = {
      seed,
      items: rows.map((row) => ({
        questionId: row.questionId,
        version: row.version,
        optionOrder: optionOrderFor(row, `${seed}:${row.questionId}`, rule.randomiseOptions),
        language: 'en',
      })),
    }
    const minutes = rule.timeLimitMinutes
    attempt.deadlineAt =
      minutes === null
        ? null
        : new Date(Date.parse(attempt.startedAt) + minutes * 60_000).toISOString()

    tables.assessmentAnswers = tables.assessmentAnswers.filter((a) => a.attemptId !== attempt.id)
    rows.forEach((question, i) => {
      const selected = picks[i] ?? []
      const earned = scoreItems([{ question, selected }]).earned
      tables.assessmentAnswers.push({
        id: stableUuid('answer', `${attempt.id}:${question.questionId}`),
        attemptId: attempt.id,
        competency: question.competency,
        selectedOption: selected.join(','),
        points: earned,
        questionId: question.questionId,
        createdAt: attempt.submittedAt ?? attempt.startedAt,
        updatedAt: attempt.submittedAt ?? attempt.startedAt,
      })
    })
  }
  convert('pre', 50)
  convert('post', 80)
}
