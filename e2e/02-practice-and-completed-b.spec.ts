import { ACCOUNTS } from './support/env'
import { pageHeading, signInAs } from './support/ui'
import { expect, test } from './support/walkthrough'

/**
 * Walkthrough 5–7 minutes (brief §17): text practice, then the completed Program B example.
 * Evidence: transcript, criterion scores, pre/post improvement and no certificate.
 */
const REPLIES = [
  'I am really sorry, I understand how disappointing this is when you planned your day around it.',
  'Can I check what time you need to be back and how many people are in your group?',
  'Let me verify with the operator now. I can offer the same experience tomorrow morning or a similar desert tour this evening.',
  'If neither works, I will escalate to my supervisor for a full refund and confirm everything in writing.',
  'I will send you a follow-up message with the confirmed option and my name so you know who to contact.',
  'Thank you for your patience. Is there anything else I can help you with today?',
]

test('5–6 min: Maha runs a scored text practice from her path', async ({ page }) => {
  await signInAs(page, ACCOUNTS.maha, '/learner/learning?programme=B')
  await page.getByRole('link', { name: /AI complaint scenario: Changed booking/ }).click()
  // The path link opens the scenario directly.
  await expect(page).toHaveURL(/\/learner\/practice\/changed-booking/)
  await expect(page.getByText('Simulated AI practice').first()).toBeVisible()
  await page.getByRole('button', { name: 'Start conversation' }).click()

  const conversation = page
    .getByRole('log')
    .or(page.getByLabel(/conversation$/))
    .first()
  for (const reply of REPLIES) {
    if (await page.getByRole('button', { name: 'Get feedback' }).isVisible()) break
    await page.getByRole('textbox', { name: /reply|say/i }).fill(reply)
    await page.getByRole('button', { name: 'Send reply' }).click()
    await expect(conversation).toContainText(reply.slice(0, 30))
    await page.waitForTimeout(400)
  }
  await page.getByRole('button', { name: 'Get feedback' }).click()
  await expect(page).toHaveURL(/\/learner\/practice\/attempts\//)
  await expect(pageHeading(page)).toHaveText('Feedback: Changed booking')
  await expect(page.getByText('Simulated AI practice').first()).toBeVisible()
  await expect(page.getByRole('img', { name: /Score \d+ out of 100/ })).toBeVisible()
  const rubric = page.getByRole('region', { name: 'Rubric' })
  await expect(rubric.getByRole('heading', { level: 3 })).toHaveCount(5)
  await expect(rubric.getByText(/Evidence:/).first()).toBeVisible()
  await expect(page.getByRole('region', { name: 'Transcript' })).toContainText(REPLIES[0] ?? '')
  await expect(page.getByText('Visitor (simulated)').first()).toBeVisible()
})

test("6–7 min: Sara's completed Program B shows +40 improvement and no certificate", async ({
  page,
}) => {
  await signInAs(page, ACCOUNTS.sara, '/learner?programme=B')
  await expect(page.getByRole('heading', { name: 'You have completed Program B.' })).toBeVisible()
  const pair = page.getByRole('region', { name: 'Baseline and post' })
  await expect(pair.getByText('60%')).toBeVisible()
  await expect(pair.getByText('100%')).toBeVisible()
  await expect(pair.getByText('+40 percentage points', { exact: false })).toBeVisible()

  // Criterion-level improvement on the progress page.
  await page.getByRole('link', { name: 'Full progress' }).click()
  await expect(pageHeading(page)).toHaveText('Progress')
  const table = page.getByRole('table', { name: /Points per competency/ })
  await expect(table.getByRole('row', { name: 'Recover service 0 20' })).toBeVisible()

  // Her completed practice keeps its transcript and criterion scores.
  await page.goto('/learner/practice')
  await page.getByRole('region', { name: 'Your attempts' }).getByRole('link').first().click()
  await expect(page.getByRole('region', { name: 'Rubric' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Conversation transcript' })).toBeVisible()

  // Program B has no certificate: no Certificates item in her navigation, and the page explains.
  await expect(page.getByRole('link', { name: 'Progress', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Certificates', exact: true })).toHaveCount(0)
  await page.goto('/learner/certificates')
  await expect(
    page.getByText('Program B builds everyday skills and has no certificate.', { exact: false }),
  ).toBeVisible()
})
