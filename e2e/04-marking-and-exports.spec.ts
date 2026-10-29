import { RESPONSE_PLAN } from './support/content'
import { ACCOUNTS } from './support/env'
import { markAssignment } from './support/marking'
import { pageHeading, signInAs } from './support/ui'
import { expect, test } from './support/walkthrough'

/**
 * Walkthrough 10–13 minutes (brief §17): the trainer records attendance and a session score for
 * Omar and reviews Daniel's resubmitted assignment; a restricted export is denied at the access
 * layer while the administrator keeps authorised access. Runs after 03 in the same browser
 * (Omar is booked).
 */
test.describe.configure({ mode: 'serial' })

const SESSION_CODE = 'SES-T01-2'

test('10–11 min: Amal records attendance and a final passing score for Omar', async ({ page }) => {
  await signInAs(page, ACCOUNTS.trainer(1), '/trainer/attendance')
  await page
    .getByRole('link', { name: new RegExp(SESSION_CODE) })
    .first()
    .click()
  await expect(
    page.getByText('In this demonstration you can still record attendance'),
  ).toBeVisible()
  const row = page.getByRole('row', { name: /^L0002 Omar Al Safi/ })
  await row.getByRole('combobox', { name: 'Attendance for L0002' }).click()
  await page.getByRole('option', { name: 'Attended', exact: true }).click()
  await expect(page.getByText('L0002 marked attended.')).toBeVisible()
  await row.getByRole('button', { name: 'Score' }).click()
  const dialog = page.getByRole('dialog', { name: 'Score L0002 Omar Al Safi' })
  await dialog.getByLabel('Preparation (of 20)').fill('17')
  await dialog.getByLabel('Communication (of 30)').fill('25')
  await dialog.getByLabel('Practical application (of 30)').fill('24')
  await dialog.getByLabel('Professionalism (of 20)').fill('18')
  await expect(dialog.getByRole('progressbar', { name: 'Total 84 out of 100' })).toBeVisible()
  await dialog
    .getByLabel('Short feedback')
    .fill('Warm greeting and clear next steps. Verify options before offering them.')
  await dialog.getByRole('button', { name: 'Submit final score' }).click()
  await expect(page.getByText('Final score 84/100 saved. Learner progress updated.')).toBeVisible()
  await expect(row.getByRole('cell', { name: '84 Pass Final' })).toBeVisible()

  // Changes propagate: Omar's session gate is now passed.
  await signInAs(page, ACCOUNTS.omar, '/learner/learning?programme=A')
  await expect(
    page.getByRole('link', { name: /Delivering service in practice.*Complete/ }),
  ).toBeVisible()
})

test('11–12 min: Daniel resubmits and Noura approves the revision', async ({ page }) => {
  await signInAs(page, ACCOUNTS.daniel, '/learner/assignments')
  await page.getByRole('link', { name: 'Visitor service response plan' }).click()
  await expect(page.getByText('Version 1 was returned for revision')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Trainer feedback on version 1' })).toContainText(
    '62/100',
  )
  await page.getByLabel('Your response plan').fill(RESPONSE_PLAN)
  await page.getByRole('button', { name: 'Submit version 2' }).click()
  // A revision goes back to the trainer who marked version 1 (Noura Al Saleh, T05, in the seed).
  await expect(page.getByText('Version 2 is with Noura Al Saleh')).toBeVisible()

  // Noura Al Saleh (T05) marks the revision.
  await signInAs(page, ACCOUNTS.trainer(5), '/trainer/assignments')
  await page
    .getByRole('link', { name: /L0004|Daniel Costa/ })
    .first()
    .click()
  await expect(pageHeading(page)).toHaveText('Daniel Costa')
  await expect(page.getByRole('heading', { name: 'Mark version 2' })).toBeVisible()
  await markAssignment(
    page,
    [20, 19, 21, 20],
    'Clear escalation path and a useful follow-up message. Well revised.',
    { draftFirst: true },
  )
  await expect(page.getByRole('heading', { name: 'Final mark, version 2' })).toBeVisible()

  // Daniel sees the updated marking and feedback.
  await signInAs(page, ACCOUNTS.daniel, '/learner/assignments/A-ASSIGN-1')
  await expect(page.getByText('Approved').first()).toBeVisible()
  await expect(
    page.getByText('Clear escalation path and a useful follow-up message.'),
  ).toBeVisible()
})

test('12–13 min: a restricted export is denied; the admin keeps authorised access', async ({
  page,
}) => {
  await signInAs(page, ACCOUNTS.trainer(1), '/trainer/attendance')
  await page
    .getByRole('link', { name: new RegExp(SESSION_CODE) })
    .first()
    .click()

  // Allowed: marks with learner ID and score only.
  const marks = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export marks (learner ID and score)' }).click()
  expect((await marks).suggestedFilename()).toMatch(/\.csv$/)

  // Denied by the exports service, with the §11 wording, and audited. No file is produced.
  let downloaded = false
  const onDownload = () => {
    downloaded = true
  }
  page.on('download', onDownload)
  await page.getByRole('button', { name: 'Export personal data' }).click()
  const alert = page.getByRole('alert').filter({ hasText: 'Your role does not allow this export.' })
  await expect(alert).toContainText('Contact the Academy administrator.')
  await expect(alert).toContainText('recorded in the audit log as denied')
  page.off('download', onDownload)
  expect(downloaded).toBe(false)

  // The administrator keeps authorised access: a report CSV with learner details.
  await signInAs(page, ACCOUNTS.admin, '/admin/reports/sessions')
  const csv = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export CSV' }).click()
  expect((await csv).suggestedFilename()).toMatch(/\.csv$/)

  // The denied attempt and the allowed report export are both in the audit log.
  await page.goto('/admin/manage/audit')
  const search = page.getByRole('textbox', { name: 'Search the audit log' })
  const events = page.getByRole('region', { name: 'Audit events' })
  await search.fill('export.personal')
  await expect(
    events.getByRole('row', { name: /Amal Al Nouri trainer export\.personal .*Denied/ }).first(),
  ).toBeVisible()
  await search.fill('export.report_csv')
  await expect(
    events.getByRole('row', { name: /Academy Admin admin export\.report_csv .*Allowed/ }).first(),
  ).toBeVisible()
})
