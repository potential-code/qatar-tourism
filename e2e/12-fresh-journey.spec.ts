import { expect, test } from '@playwright/test'
import { answerAssessment } from './support/assessments'
import { EMAILS } from './support/env'
import { chooseOption } from './support/ui'

/**
 * The presenter's opening: one click on the sign-in page opens Noor Haddad (L0036), the seeded
 * fresh learner, at the profile wizard; the profile leads to the Program B welcome and the
 * baseline. Each test gets a new browser context, so the demo data starts from the seed.
 */

test('sign-in demo learner opens Noor at the profile wizard, then the B welcome and baseline', async ({
  page,
}) => {
  await page.goto('/login')
  const learner = page.getByRole('button', { name: /Learner: start the journey/ })
  await expect(learner).toContainText(EMAILS.noor)
  await learner.click()

  await page.waitForURL(/\/onboarding$/)
  await expect(page.getByText('Step 1 of 3, L0036')).toBeVisible()
  await expect(page.getByText('Welcome, Noor')).toBeVisible()
  // Blank like a new registration: nothing is pre-filled.
  await expect(page.getByLabel('Job title')).toHaveValue('')

  await page.getByLabel('Organisation', { exact: true }).fill('Demo Coastal')
  await page.getByRole('button', { name: /Demo Coastal Travel/ }).click()
  await page.getByLabel('Job title').fill('Travel Consultant')
  await chooseOption(page, 'Job function', 'Sales')
  await chooseOption(page, 'Seniority', 'Entry level')
  await chooseOption(page, 'Experience in visitor-facing roles', '1–3 years')
  await page.getByRole('button', { name: 'Continue' }).click()

  await chooseOption(page, 'Country', 'Qatar')
  await chooseOption(page, 'Preferred learning language', 'English')
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.getByRole('button', { name: 'Communication', exact: true }).click()
  await page.getByRole('radio', { name: '30 minutes a week' }).check({ force: true })
  await page.getByLabel('I accept the demo terms and privacy information.').check()
  await page.getByRole('button', { name: 'Finish my profile' }).click()

  await page.waitForURL(/onboarding\/welcome/)
  await expect(page.getByRole('heading', { name: 'Welcome, Noor' })).toBeVisible()
  await expect(page.getByText('Program B: Visitor Service Essentials')).toBeVisible()

  await page.getByRole('link', { name: 'Start pre-assessment' }).click()
  await page.getByRole('button', { name: 'Start pre-assessment' }).click()
  const baseline = await answerAssessment(page, ['communicate_clearly'])
  await expect(page.getByText(`${baseline.percent}%`, { exact: true }).first()).toBeVisible()
})

test('"More demo learners" opens any persona straight from the sign-in page', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'More demo learners' }).click()
  await page.getByRole('button', { name: /Omar Al Safi/ }).click()
  await page.waitForURL(/\/learner/)
  await expect(page.getByText('Omar Al Safi').first()).toBeVisible()
})
