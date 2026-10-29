import { answerAssessment } from './support/assessments'
import { RESPONSE_PLAN } from './support/content'
import { ACCOUNTS } from './support/env'
import { markAssignment } from './support/marking'
import { pageHeading, signInAs } from './support/ui'
import { expect, test } from './support/walkthrough'

/**
 * Walkthrough 13–16 minutes (brief §17): Omar completes every Program A requirement and is
 * issued exactly one certificate; the admin Dashboard and reports show the updated totals.
 * Runs after 03 and 04 in the same browser (Omar booked Amal's session, attended and scored 84),
 * so Amal is the trainer who marks his assignment.
 */
test.describe.configure({ mode: 'serial' })

test('13–14 min: Omar submits his assignment and Amal approves it', async ({ page }) => {
  await signInAs(page, ACCOUNTS.omar, '/learner/learning?programme=A')
  await page.getByRole('link', { name: /Practical assignment/ }).click()
  await expect(page).toHaveURL(/\/learner\/assignments/)
  await page.getByRole('link', { name: 'Visitor service response plan' }).click()
  await page.getByLabel('Your response plan').fill(RESPONSE_PLAN)
  await page.getByRole('button', { name: /^Submit/ }).click()
  await expect(page.getByText('Version 1 is with Amal Al Nouri')).toBeVisible()

  await signInAs(page, ACCOUNTS.trainer(1), '/trainer/assignments')
  await page
    .getByRole('link', { name: /L0002|Omar Al Safi/ })
    .first()
    .click()
  await expect(pageHeading(page)).toHaveText('Omar Al Safi')
  await markAssignment(
    page,
    [22, 20, 20, 20],
    'Strong plan with verified options and a clear escalation path.',
  )
  await expect(page.getByRole('heading', { name: 'Final mark, version 1' })).toBeVisible()
})

test('14–15 min: the final assessment unlocks; passing it issues one certificate', async ({
  page,
}) => {
  await signInAs(page, ACCOUNTS.omar, '/learner/learning?programme=A')
  await page.getByRole('link', { name: /Final assessment/ }).click()
  await expect(page.getByText('You need at least 80 percent.', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Start' }).click()
  await answerAssessment(page, 'post', 5)
  await expect(page.getByText('Passed. The pass mark is 80 percent.')).toBeVisible()

  await page.getByRole('link', { name: 'Certificates', exact: true }).click()
  const certificate = page.getByRole('link', {
    name: /Program A: Tourism Service Professional QTA-DEMO-A-000121/,
  })
  await expect(certificate).toBeVisible()
  // Exactly one certificate: reloading the list does not issue another.
  await expect(page.getByRole('link', { name: /QTA-DEMO-A-/ })).toHaveCount(1)
  await page.reload()
  await expect(certificate).toBeVisible()
  await expect(page.getByRole('link', { name: /QTA-DEMO-A-/ })).toHaveCount(1)

  await certificate.click()
  await expect(
    page.getByRole('figure', {
      name: /Demonstration certificate QTA-DEMO-A-000121 for Omar Al Safi/,
    }),
  ).toBeVisible()
  const pdf = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download PDF' }).click()
  expect((await pdf).suggestedFilename()).toMatch(/QTA-DEMO-A-000121.*\.pdf$/)
  await page.getByRole('link', { name: 'Verification page' }).click()
  await expect(page.getByText('Omar Al Safi').first()).toBeVisible()
  await expect(page.getByText(/valid|Issued/i).first()).toBeVisible()
})

test('15–16 min: the admin Dashboard and reports show the updated totals', async ({ page }) => {
  await signInAs(page, ACCOUNTS.admin, '/admin')
  const certificates = page.getByRole('button', { name: /^A certificates issued 121/ })
  await expect(certificates).toBeVisible()
  await expect(page.getByRole('list', { name: 'Program A funnel' })).toContainText('121')
  // The visitor registered in 01 joined Program B: unique learners and B enrolments both grew.
  await expect(page.getByRole('button', { name: /^Unique learners/ })).toContainText('1,201')
  await expect(page.getByRole('button', { name: /^Enrolments 1261/ })).toBeVisible()
  await expect(page.getByText('Program B: 661 enrolments.', { exact: false })).toBeVisible()

  // Drill-down: the KPI opens the certification report, which reconciles.
  await certificates.click()
  await expect(pageHeading(page)).toHaveText('Certification')
  const table = page.getByRole('region', { name: 'Certification records' })
  await expect(page.getByText('121', { exact: true }).first()).toBeVisible()
  await page.getByRole('textbox', { name: 'Search' }).fill('QTA-DEMO-A-000121')
  const row = table.getByRole('row', { name: 'Open details for QTA-DEMO-A-000121' })
  await expect(row).toContainText('L0002')
  await expect(row).toContainText('Omar Al Safi')
  await expect(table.getByRole('row')).toHaveCount(2)
  await row.click()
  const detail = page.getByRole('dialog', { name: 'Omar Al Safi' })
  await expect(detail).toContainText(
    'Foundation quiz 80+, session 70+, assignment 70+, final assessment 100',
  )
  const pdf = page.waitForEvent('download')
  await detail.getByRole('button', { name: 'Download certificate PDF' }).click()
  expect((await pdf).suggestedFilename()).toBe('QTA-DEMO-A-000121.pdf')
  await detail.getByRole('link', { name: 'Open learner record' }).click()
  await expect(pageHeading(page)).toContainText('Omar Al Safi')

  // Filtered tables: Program A users narrowed to tour operators.
  await page.goto('/admin/reports/program-a')
  const rows = page
    .getByText('Enrolments', { exact: true })
    .locator('xpath=following-sibling::p[1]')
  await expect(rows).toHaveText('420')
  await page.getByRole('combobox', { name: 'Organisation type' }).click()
  await page.getByRole('option', { name: 'Tour operator' }).click()
  await expect(page.getByRole('button', { name: 'Remove Organisation type filter' })).toBeVisible()
  await expect(rows).not.toHaveText('420')
  const filtered = Number((await rows.textContent())?.replace(/,/g, ''))
  expect(filtered).toBeGreaterThan(0)
  expect(filtered).toBeLessThan(420)
  const records = page.getByRole('region', { name: 'Program A users records' })
  await expect(records.getByRole('row').nth(1)).toBeVisible()
  await page.getByRole('button', { name: 'Reset filters' }).click()
  await expect(rows).toHaveText('420')
})
