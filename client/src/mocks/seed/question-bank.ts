import type { Competency } from '@shared/constants'
import {
  type AssessmentQuestion,
  BASELINE_QUESTIONS,
  POST_QUESTIONS,
} from '@shared/content/assessments'
import { stableUuid } from './ids'
import type { Calendar } from './reference-date'
import type { SeedRow } from './rows'

type QuestionInsert = SeedRow<'questionBank'>
type RuleInsert = SeedRow<'assessmentRules'>

const SHORT: Record<Competency, string> = {
  discover_needs: 'DN',
  verify_information: 'VI',
  communicate_clearly: 'CC',
  recover_service: 'RS',
  protect_information: 'PI',
}

/**
 * The questions that exist today, in the new bank shape: the five baseline and five post items
 * (English, single choice, published, programme 'all'). The post items are medium difficulty.
 *
 * TODO(lane E): author the 24 original questions with linked Arabic variants (same `sharedId`,
 * `language: 'ar'`), including multiple-choice and scenario types, and replace or extend this
 * list. The seeded rules below draw two per competency from the bank, so the bank must keep at
 * least two published English and two published Arabic questions per competency.
 */
export function buildQuestionBank(cal: Calendar): QuestionInsert[] {
  const created = cal.ago(100)
  const map = (
    source: readonly AssessmentQuestion[],
    set: 'BL' | 'PO',
    difficulty: 'easy' | 'medium',
  ): QuestionInsert[] =>
    source.map((q) => {
      const sharedId = `QS-${SHORT[q.competency]}-${set}`
      const questionId = `Q-${SHORT[q.competency]}-${set}-EN`
      const correct = q.options.find((o) => o.key === q.correct)
      return {
        id: stableUuid('question', questionId),
        questionId,
        sharedId,
        competency: q.competency,
        programme: 'all' as const,
        difficulty,
        language: 'en' as const,
        type: 'single' as const,
        prompt: q.prompt,
        options: q.options.map((o) => ({ key: o.key, text: o.text })),
        correct: [q.correct],
        feedback: `The best response is: ${correct?.text ?? ''}.`,
        points: 20,
        version: 1,
        status: 'published' as const,
        createdAt: created,
        updatedAt: created,
      }
    })
  return [...map(BASELINE_QUESTIONS, 'BL', 'easy'), ...map(POST_QUESTIONS, 'PO', 'medium')]
}

const COMPETENCY_ORDER = Object.keys(SHORT) as Competency[]

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
    const perCompetency = kind === 'pre' ? 1 : 2
    return {
      id: stableUuid('assessment-rule', `${kind}:${programme}:1`),
      kind,
      programme,
      assessmentId: kind === 'pre' ? assessments.pre : assessments.post,
      drawCount: perCompetency * COMPETENCY_ORDER.length,
      draws: COMPETENCY_ORDER.map((competency) => ({
        competency,
        difficulty: 'any' as const,
        count: perCompetency,
      })),
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
