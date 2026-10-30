import type { ContentLanguage, ProgrammeCode, QuestionType } from '@shared/constants'
import { COMPETENCY_LABELS } from '@shared/content/assessments'
import type { AssessmentAttemptRow, AttemptSnapshotItem, QuestionBankRow } from '@shared/types/db'
import { ApiError, commit, db, now, updateRow } from '../api'
import { recordAudit } from '../audit.service'
import { recomputeEnrolment } from '../progress/recompute'
import { type Scored, scoreItems } from './draw'

/**
 * Rules-engine attempts: reading a frozen snapshot back as questions, saving answers, scoring,
 * and closing an attempt when its time runs out. An attempt's snapshot names question versions,
 * and published versions are never edited, so a later bank edit cannot change a taken attempt.
 */

export interface LearnerQuestion {
  /** Question id (QuestionBankRow.questionId); for the legacy foundation quiz, the competency. */
  id: string
  competency: string
  competencyLabel: string
  type: QuestionType
  prompt: string
  options: { key: string; text: string }[]
  language: ContentLanguage
}

export interface SnapshotQuestion {
  item: AttemptSnapshotItem
  question: QuestionBankRow
}

export const isEngineAttempt = (row: Pick<AssessmentAttemptRow, 'snapshot'>) =>
  row.snapshot !== null

/** The bank rows an attempt drew, in the order shown. Versions are looked up exactly. */
export function snapshotQuestions(row: Pick<AssessmentAttemptRow, 'snapshot'>): SnapshotQuestion[] {
  return (row.snapshot?.items ?? []).flatMap((item) => {
    const question = db.questionBank.find(
      (q) => q.questionId === item.questionId && q.version === item.version,
    )
    return question ? [{ item, question }] : []
  })
}

export function toLearnerQuestion({ item, question }: SnapshotQuestion): LearnerQuestion {
  const byKey = new Map(question.options.map((o) => [o.key, o]))
  return {
    id: question.questionId,
    competency: question.competency,
    competencyLabel: COMPETENCY_LABELS[question.competency],
    type: question.type,
    prompt: question.prompt,
    options: item.optionOrder.flatMap((key) => {
      const option = byKey.get(key)
      return option ? [{ key, text: option.text }] : []
    }),
    language: item.language,
  }
}

/** Saved selections by question id (several keys for a multiple-choice answer). */
export function savedSelections(attemptId: string): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const answer of db.assessmentAnswers) {
    if (answer.attemptId !== attemptId || !answer.questionId) continue
    map.set(answer.questionId, answer.selectedOption === '' ? [] : answer.selectedOption.split(','))
  }
  return map
}

export function scoreAttempt(row: AssessmentAttemptRow): Scored {
  const selections = savedSelections(row.id)
  return scoreItems(
    snapshotQuestions(row).map(({ question }) => ({
      question,
      selected: selections.get(question.questionId) ?? [],
    })),
  )
}

export function programmeOfEnrolment(enrolmentId: string): ProgrammeCode {
  const enrolment = db.enrolments.find((e) => e.id === enrolmentId)
  const programme = enrolment
    ? db.programmes.find((p) => p.id === enrolment.programmeId)
    : undefined
  if (!programme) throw ApiError.notFound('Enrolment not found')
  return programme.code
}

export function touchEnrolment(enrolmentId: string, instant: string) {
  const row = db.enrolments.find((e) => e.id === enrolmentId)
  if (row) updateRow(row, { lastActivityAt: instant })
}

/** Scores the saved answers and closes the attempt at `submittedAt`. Does not commit. */
export function closeAttempt(row: AssessmentAttemptRow, submittedAt: string): Scored {
  const scored = scoreAttempt(row)
  updateRow(row, {
    status: 'submitted',
    score: scored.score,
    competencyScores: scored.byCompetency as Record<string, number>,
    submittedAt,
  })
  touchEnrolment(row.enrolmentId, submittedAt)
  recomputeEnrolment(row.learnerId, programmeOfEnrolment(row.enrolmentId))
  return scored
}

/** Has the attempt's time limit run out? An attempt without a deadline never expires. */
export function isExpired(row: Pick<AssessmentAttemptRow, 'status' | 'deadlineAt'>): boolean {
  return (
    row.status === 'in_progress' &&
    row.deadlineAt !== null &&
    now().getTime() >= Date.parse(row.deadlineAt)
  )
}

/**
 * Closes an expired attempt with the answers saved so far, stamped at its deadline so the record
 * shows it ended on the clock rather than by the learner. Returns true when it closed the attempt.
 */
export function settleIfExpired(row: AssessmentAttemptRow): boolean {
  if (!isExpired(row) || !row.deadlineAt) return false
  const scored = closeAttempt(row, row.deadlineAt)
  const answered = savedSelections(row.id).size
  recordAudit(null, {
    action: 'assessment.auto_submit',
    objectType: 'assessment_attempt',
    objectId: row.id,
    before: { status: 'in_progress' },
    after: {
      status: 'submitted',
      score: scored.score,
      answered,
      questions: row.snapshot?.items.length ?? 0,
    },
    reason: 'The time limit ended, so the saved answers were submitted automatically',
  })
  return true
}

/** Settles every expired open attempt (admin lists and reports read fresh numbers). */
export function settleAllExpired(): number {
  let settled = 0
  for (const row of db.assessmentAttempts) if (settleIfExpired(row)) settled += 1
  if (settled > 0) commit()
  return settled
}

/** Did the attempt end on the clock? Auto-submitted attempts are stamped at their deadline. */
export function wasAutoSubmitted(
  row: Pick<AssessmentAttemptRow, 'status' | 'deadlineAt' | 'submittedAt'>,
): boolean {
  return (
    row.status === 'submitted' &&
    row.deadlineAt !== null &&
    row.submittedAt !== null &&
    Date.parse(row.submittedAt) >= Date.parse(row.deadlineAt)
  )
}

export const secondsLeft = (row: Pick<AssessmentAttemptRow, 'deadlineAt'>): number | null =>
  row.deadlineAt === null
    ? null
    : Math.max(0, Math.round((Date.parse(row.deadlineAt) - now().getTime()) / 1000))
