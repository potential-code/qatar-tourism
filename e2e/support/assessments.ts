import { expect, type Page } from '@playwright/test'
import {
  POINTS_BY_TYPE,
  QUESTION_CONTENT,
  type QuestionContent,
} from '../../client/src/services/assessments/question-content'
import type { Competency } from '../../shared/constants'

/** English question bank (SPEC §6). Draws are random per attempt, so answers are found by prompt. */
const BANK_EN = QUESTION_CONTENT.map((q) => ({ ...q, text: q.en }))

type BankItem = (typeof BANK_EN)[number]

export interface AnsweredQuestion {
  code: QuestionContent['code']
  prompt: string
}

export interface AnsweredAttempt {
  /** The drawn questions, in order. */
  drawn: AnsweredQuestion[]
  /** The score the app should show: points are weighted by question type (SPEC §6). */
  percent: number
}

function questionLegend(page: Page) {
  // The language switcher has its own (screen reader only) legend, so match the question's.
  return page.locator('legend').filter({ hasText: /Question \d+ of \d+/ })
}

/** Finds the question on screen in the English bank. Throws when the prompt is unknown. */
async function currentQuestion(page: Page): Promise<BankItem> {
  // The prompt is the legend's own language span; match it exactly (one prompt may contain another).
  const prompt = ((await questionLegend(page).locator('span[lang]').textContent()) ?? '').trim()
  const item = BANK_EN.find((q) => q.text.prompt === prompt)
  if (!item) throw new Error(`Question not in the seeded bank: ${prompt}`)
  return item
}

/**
 * Answers the assessment on screen from the drawn questions: the first `correct` questions get the
 * right answers, the rest a wrong one. A list of competencies answers those competencies right. Options are matched by their text from the seeded bank.
 * Returns the drawn questions (so a test can compare two attempts) and the expected percentage.
 */
export async function answerAssessment(
  page: Page,
  correct: number | readonly Competency[],
): Promise<AnsweredAttempt> {
  const legend = questionLegend(page)
  await expect(legend).toContainText(/Question 1 of \d+/)
  const total = Number(/of (\d+)/.exec((await legend.textContent()) ?? '')?.[1])
  const drawn: AnsweredQuestion[] = []
  let earned = 0
  let available = 0
  for (let i = 0; i < total; i++) {
    await expect(legend).toContainText(`Question ${i + 1} of ${total}`)
    const item = await currentQuestion(page)
    drawn.push({ code: item.code, prompt: item.text.prompt })
    const keys: string[] = []
    available += POINTS_BY_TYPE[item.type]
    const right = typeof correct === 'number' ? i < correct : correct.includes(item.competency)
    if (right) {
      keys.push(...item.correct)
      earned += POINTS_BY_TYPE[item.type]
    } else {
      const wrong = item.text.options.findIndex(
        (_, idx) => !item.correct.includes(String.fromCharCode(65 + idx)),
      )
      keys.push(String.fromCharCode(65 + wrong))
    }
    for (const key of keys) {
      const option = item.text.options[key.charCodeAt(0) - 65] ?? ''
      const label = page.locator('label').filter({ has: page.getByText(option, { exact: true }) })
      await label.click()
      await expect(label.locator('input')).toBeChecked()
    }
    if (i < total - 1) await page.getByRole('button', { name: 'Next' }).click()
  }
  await page.getByRole('button', { name: 'Submit answers' }).click()
  return { drawn, percent: Math.round((earned / available) * 100) }
}
