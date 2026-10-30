import type { Competency } from '@shared/constants'
import type { DemoDb } from '@/mocks/db'
import { snapshotQuestions } from '../assessments/attempts'
import * as assessments from '../assessments.service'

/** Test helpers for rule-driven attempts: the learner API never exposes the answer key. */

export function attemptRow(db: DemoDb, attemptId: string) {
  const row = db.assessmentAttempts.find((a) => a.id === attemptId)
  if (!row) throw new Error(`No attempt ${attemptId}`)
  return row
}

/** Saves an answer for every drawn question: correct ones, except the competencies listed. */
export async function answerAll(db: DemoDb, attemptId: string, wrong: readonly Competency[] = []) {
  for (const { question } of snapshotQuestions(attemptRow(db, attemptId))) {
    const miss = wrong.includes(question.competency)
    const selected = miss
      ? [question.options.find((o) => !question.correct.includes(o.key))?.key as string]
      : [...question.correct]
    await assessments.saveAnswer({ attemptId, questionId: question.questionId, selected })
  }
}

export async function answerAndSubmit(
  db: DemoDb,
  attemptId: string,
  wrong: readonly Competency[] = [],
) {
  await answerAll(db, attemptId, wrong)
  return assessments.submit(attemptId)
}

/** Starts an attempt and submits it with the given competencies answered wrongly. */
export async function takeAttempt(
  db: DemoDb,
  programme: 'A' | 'B',
  kind: 'pre' | 'post',
  wrong: readonly Competency[] = [],
  language = 'en',
) {
  const { attemptId } = await assessments.start(programme, kind, language)
  return { attemptId, result: await answerAndSubmit(db, attemptId, wrong) }
}
