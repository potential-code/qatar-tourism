import type { Page } from '@playwright/test'
import { answerAssessment } from './support/assessments'
import { pageHeading } from './support/ui'
import { expect, test } from './support/walkthrough'

/**
 * Walkthrough 0–5 minutes (brief §17): homepage and A/B/C, then a new visitor registers,
 * completes the profile and baseline and generates a personalised Program B path.
 */
test.describe.configure({ mode: 'serial' })

const stamp = Date.now().toString(36)
const visitor = {
  name: 'Noor Haddad',
  email: `visitor.${stamp}@example.com`,
  password: 'VisitorDemo2026!',
}

test('0–2 min: homepage shows branding, the A/B/C cards and public entry', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('img', { name: /Qatar Tourism/i }).first()).toBeVisible()
  await expect(pageHeading(page)).toHaveText(
    'Build the skills to create memorable visitor experiences.',
  )
  const programmes = page.getByRole('region', { name: 'Find your next learning journey' })
  for (const title of [
    'Tourism Service Professional',
    'Visitor Service Essentials',
    'Destination Storytelling',
  ]) {
    await expect(programmes.getByRole('heading', { name: title })).toBeVisible()
  }
  // Meaningful differences: A certifies, B does not, C is an illustrative sample.
  await expect(programmes.getByText('Demonstration certificate', { exact: true })).toBeVisible()
  await expect(programmes.getByText('No certificate', { exact: true })).toBeVisible()
  await expect(programmes.getByText('Illustrative sample', { exact: true })).toBeVisible()

  await programmes.getByRole('link', { name: 'View programme' }).first().click()
  await expect(page).toHaveURL(/\/programmes\/a$/i)
  await expect(pageHeading(page)).toContainText('Tourism Service Professional')

  await page.goto('/')
  await page.getByRole('link', { name: 'Start your journey' }).first().click()
  await expect(page).toHaveURL(/\/register/)
})

test('2–5 min: register, profile, baseline and a generated B path', async ({ page }) => {
  await page.goto('/register')
  await expect(page.getByText(/New accounts start with Program B/)).toBeVisible()
  await page.getByLabel('Full name').fill(visitor.name)
  await page.getByLabel('Email').fill(visitor.email)
  await page.getByLabel('Password', { exact: true }).fill(visitor.password)
  await page.getByRole('button', { name: 'Create account' }).click()

  // Simulated verification (labelled), then the profile wizard.
  await expect(page.getByRole('heading', { name: 'Verify your email' })).toBeVisible()
  await page
    .getByRole('button', { name: /Show my demo code|Use the demo code/ })
    .first()
    .click()
  await page.getByRole('button', { name: 'Use the demo code' }).click()
  await page.getByRole('button', { name: /Verify/ }).click()
  await page.waitForURL(/onboarding/)

  // Profile wizard, step 1: a hotel front office role routes to the hotel guest services path.
  await page.getByLabel('Organisation', { exact: true }).fill('Demo Pearl')
  await page.getByRole('button', { name: /Demo Pearl Hospitality/ }).click()
  await page.getByLabel('Job title').fill('Front Office Agent')
  await chooseOption(page, 'Job function', 'Front office')
  await chooseOption(page, 'Seniority', 'Entry level')
  await chooseOption(page, 'Experience in visitor-facing roles', '1–3 years')
  await page.getByRole('button', { name: 'Continue' }).click()

  // Step 2: location and language.
  await chooseOption(page, 'Country', 'Qatar')
  await chooseOption(page, 'Preferred learning language', 'English')
  await page.getByRole('button', { name: 'Continue' }).click()

  // Step 3: goals, weekly time and consent.
  await page.getByRole('button', { name: 'Complaint handling', exact: true }).click()
  await page.getByRole('button', { name: 'Communication', exact: true }).click()
  await page.getByRole('radio', { name: '60 minutes a week' }).check({ force: true })
  await page.getByLabel('I accept the demo terms and privacy information.').check()
  await page.getByRole('button', { name: 'Finish my profile' }).click()
  await page.waitForURL(/onboarding\/welcome/)
  await expect(page.getByRole('heading', { name: 'Welcome, Noor' })).toBeVisible()
  // Default B routing with a tailored, rule-matched starting path.
  await expect(page.getByText('Program B: Visitor Service Essentials')).toBeVisible()
  await expect(page.getByText('Your starting path: Hotel guest services')).toBeVisible()

  // Baseline: five questions, no pass mark.
  await page.getByRole('link', { name: 'Start pre-assessment' }).click()
  await page.getByRole('button', { name: 'Start pre-assessment' }).click()
  await answerAssessment(page, 'baseline', 2)
  await expect(page.getByText('40', { exact: false }).first()).toBeVisible()
  await page.getByRole('link', { name: 'Build my learning path' }).click()
  await expect(page.getByRole('heading', { name: 'Your personalised learning path' })).toBeVisible()
  await expect(page.getByText('Demo mode: scripted recommendation')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Baseline 40%' })).toBeVisible()
  await page.getByRole('button', { name: 'Build my learning path' }).click()
  await expect(page.getByRole('figure', { name: 'Why we recommend this' })).toContainText(
    'lowest baseline areas',
  )
  const units = page.getByRole('region', { name: 'Suggested units' })
  await expect(units.getByText('Welcoming every visitor')).toBeVisible()
  await expect(units.getByText(/AI complaint scenario/)).toBeVisible()
  await expect(units.getByText('Recommended extra')).toBeVisible()
  await page.getByRole('button', { name: 'Start this path' }).click()
  await expect(page.getByRole('heading', { name: 'My learning', level: 1 })).toBeVisible()
  await expect(
    page.getByRole('link', { name: /Step 1 .*Pre-assessment \(baseline\).*Complete/ }),
  ).toBeVisible()

  // A playable, captioned video unit.
  await page.getByRole('link', { name: /Welcoming every visitor/ }).click()
  await expect(
    page.getByRole('heading', { name: 'Welcoming every visitor', level: 1 }),
  ).toBeVisible()
  await expect(page.getByText('Sample video (captioned)')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Transcript' })).toContainText('A helpful welcome')
  const video = page.locator('video').first()
  await expect(video.locator('track[kind="captions"]')).toHaveCount(1)
  const played = await video.evaluate(async (element: HTMLVideoElement) => {
    element.muted = true
    await element.play()
    await new Promise((resolve) => setTimeout(resolve, 2000))
    element.pause()
    return element.currentTime
  })
  expect(played).toBeGreaterThan(0.5)

  // The real sample interactive package (SCORM 2004) recommended for the baseline gap.
  await page.goto('/learner/learning/C04?programme=B')
  await expect(page.getByText('SCORM 2004 sample package', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Launch' }).click()
  const scorm = page.frameLocator('iframe').first()
  await expect(
    scorm.getByRole('heading', { name: 'A changed booking, a disappointed visitor' }),
  ).toBeVisible()
  await scorm.getByRole('button', { name: 'Start' }).click()
  await expect(scorm.getByText('Step 2 of 6')).toBeVisible()
  await scorm.getByRole('button', { name: 'Save and exit' }).click()
  // Closing commits to the LMS: the unit resumes where the learner left it.
  await expect(page.getByRole('heading', { name: 'Continue where you left off' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible()
})

async function chooseOption(page: Page, label: string, option: string) {
  await page.getByLabel(label, { exact: true }).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}
