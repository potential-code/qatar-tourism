import { expect, type Page } from '@playwright/test'

const RUBRIC = [
  'Discovery questions',
  'Two feasible options',
  'Escalation path',
  'Follow-up message',
]

/** Fills the assignment rubric (four parts out of 25), feedback and a decision on the open page. */
export async function markAssignment(
  page: Page,
  scores: [number, number, number, number],
  feedback: string,
  options: { draftFirst?: boolean } = {},
) {
  for (const [i, part] of RUBRIC.entries()) {
    await page.getByRole('spinbutton', { name: `${part} score` }).fill(String(scores[i]))
  }
  const total = scores.reduce((sum, n) => sum + n, 0)
  await expect(page.getByText(`${total}/100`, { exact: true }).first()).toBeVisible()
  await page.getByLabel('Feedback for the learner').fill(feedback)
  if (options.draftFirst) {
    await page.getByRole('button', { name: 'Save draft' }).click()
    await expect(page.getByText(/^Draft saved/).first()).toBeVisible()
  }
  await page.getByRole('radio', { name: /^Approve/ }).check({ force: true })
  await page.getByRole('button', { name: 'Finalise' }).click()
  const confirm = page.getByRole('dialog', { name: `Approve with ${total}/100?` })
  await expect(confirm).toContainText('simulated demo email')
  await confirm.getByRole('button', { name: 'Approve' }).click()
  await expect(confirm).toBeHidden()
  return total
}
