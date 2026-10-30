/**
 * The renewal knowledge check (SPEC §7: the renewal checklist needs a post-assessment). Five short
 * scenario questions; prompts and options are authored in English and Arabic in the `record`
 * i18n namespace (`renewal.check.<id>.*`). Only the answer keys live here.
 *
 * Demo settings — subject to Qatar Tourism confirmation: the pass mark and the CPD a refresher
 * earns are proposed values, not policy.
 */

export interface RenewalCheckQuestion {
  id: string
  options: readonly string[]
  correct: string
}

export const RENEWAL_CHECK_QUESTIONS: readonly RenewalCheckQuestion[] = [
  { id: 'q1', options: ['a', 'b', 'c'], correct: 'b' },
  { id: 'q2', options: ['a', 'b', 'c'], correct: 'c' },
  { id: 'q3', options: ['a', 'b', 'c'], correct: 'a' },
  { id: 'q4', options: ['a', 'b', 'c'], correct: 'b' },
  { id: 'q5', options: ['a', 'b', 'c'], correct: 'c' },
]

export const RENEWAL_CHECK_PASS_PERCENT = 80

/** CPD earned by completing the refresher course, in hours. */
export const REFRESHER_CPD_HOURS = 2

export function scoreRenewalCheck(answers: Record<string, string>) {
  const correct = RENEWAL_CHECK_QUESTIONS.filter((q) => answers[q.id] === q.correct).length
  const total = RENEWAL_CHECK_QUESTIONS.length
  const percent = Math.round((correct / total) * 100)
  return { correct, total, percent, passed: percent >= RENEWAL_CHECK_PASS_PERCENT }
}
