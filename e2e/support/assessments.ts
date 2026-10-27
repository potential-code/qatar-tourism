import { expect, type Page } from '@playwright/test'
import { type AssessmentVariant, QUESTION_BANK } from '../../shared/content/assessments'

/**
 * Answers the five-question assessment on screen. Options are shuffled, so each answer is found
 * by its text from the shared question bank: the first `correct` questions get the right answer.
 */
export async function answerAssessment(page: Page, variant: AssessmentVariant, correct: number) {
  const bank = QUESTION_BANK[variant]
  for (let i = 0; i < bank.length; i++) {
    const legend = page.locator('legend').first()
    await expect(legend).toContainText(`Question ${i + 1} of ${bank.length}`)
    const text = (await legend.textContent()) ?? ''
    const question = bank.find((q) => text.includes(q.prompt))
    if (!question) throw new Error(`Unknown question: ${text}`)
    const key =
      i < correct ? question.correct : question.options.find((o) => o.key !== question.correct)?.key
    const option = question.options.find((o) => o.key === key)
    await page
      .locator('label')
      .filter({ hasText: option?.text ?? '' })
      .click()
    if (i < bank.length - 1) await page.getByRole('button', { name: 'Next' }).click()
  }
  await page.getByRole('button', { name: 'Submit answers' }).click()
}
