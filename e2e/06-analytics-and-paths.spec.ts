import { expect, type Locator, type Page, test } from '@playwright/test'
import { ACCOUNTS } from './support/env'
import { pageHeading, signInAs } from './support/ui'

/**
 * Walkthrough 16–19 minutes (brief §17): two AI Analytics questions answered from actual data,
 * with the underlying records; then a new path variant with profile rules and a learner preview.
 */
test.describe.configure({ mode: 'serial' })

const VARIANT = `B Tour operator welcome ${Date.now().toString(36).slice(-4)}`

test('16–17 min: AI Analytics answers two questions from the real data', async ({ page }) => {
  await signInAs(page, ACCOUNTS.admin, '/admin/ai-analytics')
  await expect(page.getByText('Demo analytics assistant').first()).toBeVisible()
  const conversation = page.getByRole('region', { name: 'Conversation' })
  // At least seven supported analytical questions (brief §18).
  const prompts = conversation
    .getByRole('region', { name: 'Suggested prompts' })
    .getByRole('button')
  expect(await prompts.count()).toBeGreaterThanOrEqual(7)
  await conversation
    .getByRole('button', { name: 'How many learners are in each programme?' })
    .click()
  const canvas = page.getByRole('region', { name: 'Results canvas' })
  await expect(canvas.getByRole('heading', { name: 'Learners by programme' })).toBeVisible()
  const data = canvas.getByRole('table', { name: 'Learners by programme data' })
  await expect(data.getByRole('row', { name: /^Program A 420/ })).toBeVisible()
  await expect(data.getByRole('row', { name: /^Program B 66\d/ })).toBeVisible()
  await expect(canvas.getByText('Sample size')).toBeVisible()

  // A typed question: computed answer, chart, table and the underlying records.
  await conversation
    .getByRole('textbox', { name: 'Ask a question about the Academy data' })
    .fill('Compare pre and post scores for Program B.')
  await conversation.getByRole('button', { name: 'Send question' }).click()
  await expect(
    canvas.getByRole('heading', { name: 'Pre and post scores, Program B' }),
  ).toBeVisible()
  await expect(conversation.getByText('2 questions this session')).toBeVisible()
  const pairs = canvas.getByRole('table', { name: 'Pre and post scores, Program B data' })
  await expect(pairs.getByRole('row', { name: /^Overall score/ })).toBeVisible()
  await expect(canvas.getByText(/paired learners/)).toBeVisible()
  await canvas.getByRole('button', { name: 'View underlying records' }).click()
  await expect(pageHeading(page)).toHaveText('Assessments and improvement')
  await expect(page.getByRole('button', { name: 'Remove Programme filter' })).toBeVisible()
  await expect(page.getByText('Paired pre/post', { exact: true })).toBeVisible()
})

test('17–19 min: create a path variant, set its rule and preview a learner', async ({ page }) => {
  await signInAs(page, ACCOUNTS.admin, '/admin/manage/paths?programme=B')
  await page.getByRole('button', { name: 'New path variant' }).click()
  const create = page.getByRole('dialog', { name: 'New Program B path variant' })
  await create.getByLabel('Path name').fill(VARIANT)
  await create
    .getByLabel('Description')
    .fill('C01, C02 and C03 with a guiding practice scenario for tour operator staff.')
  await create.getByRole('button', { name: 'Create draft' }).click()
  await expect(pageHeading(page)).toContainText(VARIANT)

  // Change one module: C05 becomes optional in this variant, then preview it as Maha.
  await page
    .getByRole('switch', { name: 'Planning a helpful visitor response is required' })
    .click()
  await page.getByRole('button', { name: 'Save draft' }).click()
  await expect(page.getByText(/Complete all 6 required items/)).toBeVisible()
  const preview = page.getByRole('tabpanel', { name: 'Learner preview' })
  await preview.getByLabel('Preview as learner').fill('L0001')
  await preview.getByRole('button', { name: 'Preview' }).click()
  await expect(preview.getByText("Maha's learning path")).toBeVisible()
  await expect(preview.getByText(/of 6 required steps complete/)).toBeVisible()

  await page.getByRole('button', { name: 'Publish v1' }).click()
  const publish = page.getByRole('dialog', { name: 'Publish version 1' })
  await expect(publish.getByRole('region', { name: 'Impact on existing learners' })).toBeVisible()
  await publish.getByLabel('Version note').fill('Tour operator variant: C05 optional.')
  await publish.getByRole('button', { name: 'Publish version 1' }).click()
  await expect(publish).toBeHidden()

  // A profile rule assigns the variant to tour operators, previewed with Omar's profile.
  await page
    .getByRole('navigation', { name: 'Breadcrumb' })
    .getByRole('link', { name: 'Learning path management' })
    .click()
  await page.getByRole('button', { name: 'Add rule' }).click()
  const rule = page.getByRole('dialog', { name: 'New Program B rule' })
  await rule.getByLabel('Rule name').fill(`${VARIANT} rule`)
  await rule.getByLabel('Rule wording').fill('Organisation type = tour operator')
  await chooseIn(page, rule.getByRole('combobox', { name: 'Assigns path' }), VARIANT)
  await rule.getByRole('spinbutton', { name: 'Priority' }).fill('15')
  await chooseIn(page, rule.getByRole('combobox', { name: 'Status' }), 'Published')
  await chooseIn(page, rule.getByRole('combobox', { name: 'Value' }), 'Tour operator')
  await expect(rule.getByText('Reads as: Organisation type is Tour operator')).toBeVisible()

  // Live preview with Omar (Demo Horizon Tours, a tour operator).
  await rule.getByLabel('Learner ID').fill('L0002')
  await rule.getByRole('button', { name: 'Preview' }).click()
  await expect(rule.getByText('Omar Al Safi', { exact: false }).first()).toBeVisible()
  const resolved = rule.getByText('Resolved path').locator('xpath=following-sibling::p[1]')
  await expect(resolved).toHaveText(VARIANT)
  await rule.getByRole('button', { name: 'Save rule' }).click()
  await expect(rule).toBeHidden()

  const rules = page.getByRole('region', { name: 'Assignment rules' })
  await expect(rules.getByText(`Assigns ${VARIANT}`)).toBeVisible()

  // The published rules now resolve Omar's profile to the variant; Maha keeps the hotel path.
  const match = page.getByRole('complementary').filter({ hasText: 'Preview the match' })
  await match.getByLabel('Learner ID').fill('L0002')
  await match.getByRole('button', { name: 'Preview' }).click()
  const winner = match.getByText('Resolved path').locator('xpath=following-sibling::p[1]')
  await expect(winner).toHaveText(VARIANT)
  await match.getByLabel('Learner ID').fill('L0001')
  await match.getByRole('button', { name: 'Preview' }).click()
  await expect(winner).toHaveText('B Hotel guest services')
})

async function chooseIn(page: Page, combobox: Locator, option: string) {
  await combobox.click()
  await page.getByRole('option', { name: option, exact: true }).click()
}
