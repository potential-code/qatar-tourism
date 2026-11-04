import { readFileSync } from 'node:fs'
import type { Page } from '@playwright/test'
import type RecordCopy from '../client/src/i18n/locales/en/record.json'
import { RENEWAL_CHECK_QUESTIONS } from '../client/src/services/credentials/renewal-check'
import { answerAssessment } from './support/assessments'
import { expect, test } from './support/checklist'
import { ACCOUNTS, EMAILS } from './support/env'
import {
  pageHeading,
  resetDemoThroughUi,
  signInAs,
  signInWithForm,
  waitForSave,
} from './support/ui'

/**
 * SPEC §10 walkthrough acceptance checks 1 to 7, in order, in one browser (the demo data lives in
 * IndexedDB). Learner ids: Mariam Al Nuaimi LRN-0042 (user-l0042) is the demonstration learner;
 * the waitlist, lock and assessment checks use other seeded learners so Mariam's story stays intact.
 */
test.describe.configure({ mode: 'serial' })

/** The English copy of the record screens (the renewal check's questions and answers). */
const record = JSON.parse(
  readFileSync(new URL('../client/src/i18n/locales/en/record.json', import.meta.url), 'utf8'),
) as typeof RecordCopy

const ID = {
  mariam: ACCOUNTS.mariam,
  /** Confirmed on the full session SES-T03-2; cancels to release a seat. */
  cancelling: 'user-l0060',
  /** First on the SES-T03-2 waitlist (LRN-0096): receives the offered seat. */
  firstWaitlisted: 'user-l0096',
  /** Eligible Program A learner who joins the waitlist (position 4). */
  joiner: ACCOUNTS.omar,
  /** Program B learner with one failed post-assessment attempt (LRN-0679, 60%). */
  assessment: 'user-l0679',
}

/** Reads a labelled figure such as "Earned and approved 6 hours" from the page text. */
async function figure(page: Page, label: string) {
  // biome-ignore lint/performance/useDomNodeTextContent: line breaks between blocks matter to the patterns
  const text = await page.getByRole('main').innerText()
  const match = new RegExp(`${label}\\s+([\\d.]+)`).exec(text)
  if (!match) throw new Error(`No figure labelled "${label}" in: ${text.slice(0, 400)}`)
  return Number(match[1])
}

test('start: the administrator resets the demo to the seed', async ({ page }) => {
  await resetDemoThroughUi(page)
  await signInAs(page, ACCOUNTS.admin, '/admin')
  await expect(page.getByRole('button', { name: /^Unique learners/ })).toContainText('1,200')
})

test('check 1: one sign-in, Programs A and B, one record, no Program B certificate', async ({
  page,
}) => {
  // Mariam signs in once, with the real form.
  await signInWithForm(page, EMAILS.mariam)
  await expect(page).toHaveURL(/\/learner/)
  const switcher = page.getByRole('combobox', { name: 'My programmes' })
  await expect(switcher).toContainText('Program A')

  // Combined history across both programmes.
  await page.getByRole('link', { name: 'My Learning Record' }).click()
  await expect(pageHeading(page)).toHaveText('My Learning Record')
  await expect(page.getByText('Learner ID LRN-0042')).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: 'Program A' }).first()).toBeVisible()
  const programmeB = page.getByRole('row').filter({ hasText: 'Program B' })
  await expect(programmeB).toHaveCount(2)
  for (const row of await programmeB.all()) {
    await expect(row).toContainText('Completed — no programme certificate')
  }

  // The credential wallet: Program A credential only, and the Program B statement.
  await page.getByRole('tab', { name: 'Certificates and CPD' }).click()
  await expect(page.getByText('QTA-DEMO-A-P25-0001')).toBeVisible()
  await expect(page.getByText('Expiring soon').first()).toBeVisible()
  await expect(page.getByText(/Program B has no programme certificate/)).toBeVisible()
  await expect(page.getByText('Earned and approved', { exact: true })).toBeVisible()

  // Switching programme changes the context without another sign-in.
  await switcher.click()
  await page.getByRole('option', { name: /Program B/ }).click()
  await expect(page).toHaveURL(/programme=B/)
  await page.getByRole('link', { name: 'My learning', exact: true }).click()
  await expect(page.getByText('One stage, Visitor Service Essentials')).toBeVisible()
  await switcher.click()
  await page.getByRole('option', { name: /Program A/ }).click()
  await expect(page.getByText('Two levels with explicit stages')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toHaveCount(0)
})

test('check 2: English and Arabic SCORM, language switch, quiz, resume, xAPI', async ({ page }) => {
  await signInAs(page, ID.mariam, '/learner/learning/C08')
  await expect(pageHeading(page)).toHaveText('Welcoming visitors to Qatar')
  const content = page.frameLocator('main iframe')

  // English first: launch, move to screen 3, then reload and resume where the learner stopped.
  await page.getByRole('button', { name: 'Launch' }).click()
  await expect(content.getByRole('list', { name: 'Screen 1 of 5' })).toBeVisible()
  await content.getByRole('button', { name: 'Next' }).click()
  await content.getByRole('button', { name: 'Next' }).click()
  await expect(content.getByRole('list', { name: 'Screen 3 of 5' })).toBeVisible()
  await expect(page.locator('p', { hasText: 'SCORM 2004 runtime connected' })).toContainText(
    /Location screen-3\s*incomplete\s*Saved/,
  )
  await waitForSave(page)
  await page.reload()
  await expect(page.getByText('screen 3 / 5')).toBeVisible()
  await page.getByRole('button', { name: 'Resume' }).click()
  await expect(content.getByRole('list', { name: 'Screen 3 of 5' })).toBeVisible()

  // Switch language mid-lesson: the bookmark is saved and the real Arabic package opens.
  await page.getByRole('radio', { name: 'العربية' }).click()
  const prompt = page.getByRole('dialog', {
    name: 'Your progress has been saved. Open the Arabic version?',
  })
  await expect(prompt).toContainText('The Arabic version continues at screen 3 of 5.')
  await prompt.getByRole('button', { name: 'Open the Arabic version' }).click()
  await expect(content.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(content.locator('html')).toHaveAttribute('lang', 'ar')
  await expect(content.getByRole('heading', { level: 1 })).toHaveText('الترحيب بزوار قطر')
  await expect(content.getByRole('list', { name: 'الشاشة 3 من 5' })).toBeVisible()
  await expect(page.getByText('Package wvq-ar-scorm2004', { exact: false })).toBeVisible()

  // Complete the Arabic knowledge check (second option is correct in each question).
  await content.getByRole('button', { name: 'التالي' }).click()
  await content.getByRole('button', { name: 'التالي' }).click()
  await expect(content.getByRole('list', { name: 'الشاشة 5 من 5' })).toBeVisible()
  for (const n of [1, 2, 3]) {
    const question = content.getByRole('group', { name: new RegExp(`^السؤال ${n} من 3`) })
    await question.getByRole('button').nth(1).click()
    await expect(question.getByRole('status')).toContainText('إجابة صحيحة')
  }
  await expect(content.getByText('اجتزت')).toBeVisible()
  await expect(page.locator('p', { hasText: 'SCORM 2004 runtime connected' })).toContainText(
    /Score 100%\s*Saved/,
  )

  // Reload: the completed unit resumes at the same place; credit is not duplicated.
  await waitForSave(page)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Unit complete' })).toBeVisible()
  await expect(page.getByText('Completion credit counts once for this unit.')).toBeVisible()
  await expect(page.getByRole('radio', { name: 'العربية' })).toBeChecked()
  await page.getByRole('button', { name: 'Resume' }).click()
  await expect(content.getByRole('list', { name: 'الشاشة 5 من 5' })).toBeVisible()

  // Back to English: the same unit, the English package.
  await page.getByRole('radio', { name: 'English', exact: true }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Open the English version/ })
    .click()
  await expect(content.locator('html')).toHaveAttribute('lang', 'en')

  // The xAPI activity: statements go to a simulated learning record store.
  await signInAs(page, ID.mariam, '/learner/learning/C09')
  await page.getByRole('button', { name: /^(Launch|Resume)$/ }).click()
  const activity = page.frameLocator('main iframe')
  await activity.getByRole('button', { name: 'Start planning' }).click()
  await activity.getByRole('button', { name: /^Museum morning/ }).click()
  await activity.getByRole('button', { name: 'Next' }).click()
  await activity.getByRole('button', { name: /^I am sorry about the change/ }).click()
  await activity.getByRole('button', { name: 'Next' }).click()
  await activity.getByRole('button', { name: 'Complete the activity' }).click()
  await expect(activity.getByText('Activity complete.', { exact: false })).toBeVisible()
  const statements = page.getByRole('region', { name: /^Your recent statements/ })
  await expect(statements).toContainText('Simulated learning record store')
  await expect(
    statements.getByRole('row', { name: /^completed pve-en-xapi 27 Oct 2026/ }),
  ).toBeVisible()
  await expect(statements.getByRole('row', { name: /^answered/ })).toBeVisible()

  // Admin Content Library: package metadata, preview in both languages and a tracking test.
  await signInAs(page, ACCOUNTS.admin, '/admin/manage/content')
  await expect(pageHeading(page)).toHaveText('Content Library')
  await expect(page.getByRole('cell', { name: 'wvq-ar-scorm2004' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'pve-en-xapi' })).toBeVisible()
  await expect(
    page.getByText('Simulated preview — no Articulate export available').first(),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Tracking test for Welcoming visitors to Qatar, English' })
    .click()
  const preview = page.getByRole('dialog', { name: /^Preview: / })
  await expect(preview.getByRole('tabpanel', { name: 'Tracking test' })).toContainText(
    'Resume (location)',
  )
  await preview.getByRole('radio', { name: 'العربية' }).click()
  // The preview also saves the bookmark before it switches language.
  await page
    .getByRole('dialog', { name: 'Your progress has been saved. Open the Arabic version?' })
    .getByRole('button', { name: 'Open the Arabic version' })
    .click()
  await preview.getByRole('tab', { name: 'Package' }).click()
  await expect(preview.getByRole('tabpanel', { name: 'Package' })).toContainText('wvq-ar-scorm2004')
  await expect(preview.getByRole('tabpanel', { name: 'Package' })).toContainText(
    'Arabic (ar, right-to-left)',
  )
  await preview.getByRole('button', { name: 'Close' }).first().click()
  await page
    .getByRole('button', { name: 'Tracking test for Planning a visitor experience, English' })
    .click()
  await expect(
    page.getByRole('dialog', { name: 'Preview: Planning a visitor experience' }),
  ).toContainText('Simulated learning record store')
})

test('check 3: waitlist, seat offer, acceptance, roster, approval, lock and unlock', async ({
  page,
}) => {
  const session = 'Handling a changed booking'

  // A learner joins the waitlist of the full session SES-T03-2.
  await signInAs(page, ID.joiner, '/learner/sessions')
  await page.getByRole('button', { name: new RegExp(`^${session}, SES-T03-2`) }).click()
  const details = page.getByRole('dialog', { name: session })
  await expect(details).toContainText('Full, 3 on the waitlist')
  await details.getByRole('button', { name: 'Session full — join waitlist' }).click()
  const bookings = page.getByRole('region', { name: 'Your bookings' })
  await expect(bookings).toContainText('Waitlist position 4')
  await expect(bookings.getByRole('button', { name: 'Leave waitlist' })).toBeVisible()

  // A confirmed learner cancels: the seat is released.
  await signInAs(page, ID.cancelling, '/learner/sessions')
  await page.getByRole('button', { name: 'Cancel booking' }).first().click()
  await page
    .getByRole('dialog', { name: 'Cancel this booking?' })
    .getByRole('button', { name: 'Cancel booking' })
    .click()
  await expect(page.getByText('No upcoming sessions yet')).toBeVisible()

  // The first waitlisted learner is offered the seat, held for 24 hours.
  await signInAs(page, ID.firstWaitlisted, '/learner/sessions')
  const offered = page.getByRole('region', { name: 'Your bookings' })
  await expect(offered).toContainText('Seat offered')
  await expect(offered).toContainText('A seat is reserved for you')
  await expect(offered).toContainText('Offer ends 28 Oct 2026, 08:00 Qatar time')
  await offered.getByRole('button', { name: 'Accept seat' }).click()
  await expect(offered).toContainText('Confirmed')
  await expect(offered.getByRole('button', { name: 'Accept seat' })).toHaveCount(0)

  // The roster: the accepting learner is confirmed, the cancelled one is not, 3 still wait.
  await signInAs(page, ACCOUNTS.admin, '/admin/manage/sessions')
  await page.getByRole('textbox', { name: 'Search sessions' }).fill('SES-T03-2')
  await page.getByRole('button', { name: /SES-T03-2/ }).click()
  const roster = page.getByRole('dialog', { name: session })
  const confirmed = roster.getByRole('region', { name: /^Confirmed roster/ })
  await expect(confirmed).toContainText('LRN-0096')
  await expect(confirmed).not.toContainText('LRN-0060')
  await expect(confirmed.getByRole('listitem')).toHaveCount(20)
  const waitlist = roster.getByRole('region', { name: /^Waitlist/ })
  await expect(waitlist).not.toContainText('LRN-0096')
  await expect(waitlist).toContainText('LRN-0265')
  await expect(waitlist).toContainText('LRN-0002')
  await roster.getByRole('button', { name: 'Close' }).first().click()

  // Approve a pending enrolment request (not the full-session one).
  await page.goto('/admin/manage/approvals')
  const request = page.getByRole('row', { name: /REQ-0004/ })
  await expect(request).toContainText('Pending review')
  await request.getByRole('button', { name: 'Approve' }).click()
  await page
    .getByRole('dialog', { name: 'Approve REQ-0004' })
    .getByRole('button', { name: 'Approve', exact: true })
    .click()
  await expect(page.getByRole('row', { name: /REQ-0004/ })).toContainText('Approved')

  // Lock a learner with history: sign-in is blocked, history and results are kept.
  await page.goto(`/admin/manage/users/${ID.joiner}`)
  const history = page.getByRole('region', { name: 'Training History' })
  await expect(history.getByRole('row').nth(1)).toBeVisible()
  const rowsBefore = await history.getByRole('row').count()
  await page.getByRole('button', { name: 'Lock account' }).click()
  const lock = page.getByRole('dialog', { name: 'Lock account' })
  await lock.getByRole('textbox', { name: /Reason/ }).fill('Demonstration lock for the checklist')
  await lock.getByRole('button', { name: 'Lock account' }).click()
  await expect(page.getByText('Account locked (simulated)')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Unlock account' })).toBeVisible()

  await signInWithForm(page, 'omar.alsafi@example.com')
  await expect(page.getByText('This account is locked. Contact Academy support')).toBeVisible()
  await expect(page).toHaveURL(/\/login/)

  // Unlock: access returns with progress and history unchanged.
  await signInAs(page, ACCOUNTS.admin, `/admin/manage/users/${ID.joiner}`)
  await page.getByRole('button', { name: 'Unlock account' }).click()
  const unlock = page.getByRole('dialog', { name: 'Unlock account' })
  await unlock.getByRole('textbox', { name: /Reason/ }).fill('Checklist complete, restoring access')
  await unlock.getByRole('button', { name: 'Unlock account' }).click()
  await expect(page.getByText('Account unlocked')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Training History' }).getByRole('row')).toHaveCount(
    rowsBefore,
  )
  await signInWithForm(page, 'omar.alsafi@example.com')
  await expect(page).toHaveURL(/\/learner/)
  await expect(page.getByText('This account is locked.')).toHaveCount(0)
})

test('check 4: question bank preview, randomised attempts, pass rule, attempt limit and grant', async ({
  page,
}) => {
  // The bank and the rule: preview the draw for the Program A post-assessment.
  await signInAs(page, ACCOUNTS.admin, '/admin/manage/assessments')
  await expect(page.getByText('24 shared questions, 48 published variants')).toBeVisible()
  await page.getByRole('tab', { name: 'Assessment Builder' }).click()
  await page.getByRole('button', { name: 'Preview', exact: true }).click()
  await expect(page.getByText('Rule used')).toBeVisible()
  await expect(page.getByText(/Draws 10 questions from the published bank/)).toBeVisible()
  await expect(page.getByText(/Selected questions \(10, \d+ points in total\)/)).toBeVisible()
  await page.getByRole('button', { name: 'Preview in Arabic' }).click()
  await expect(page.getByText(/· Arabic/).first()).toBeVisible()

  // Attempt 2 of the learner's post-assessment: a fresh random draw, answered wrongly on purpose.
  await signInAs(page, ID.assessment, '/learner/assessments/post')
  await expect(page.getByText('Attempts remaining: 1 of 2')).toBeVisible()
  await page.getByRole('button', { name: 'Retry' }).click()
  const start = page.getByRole('button', { name: 'Start', exact: true })
  if (await start.isVisible()) await start.click()
  const second = await answerAssessment(page, 0)
  await expect(
    page.getByText('Not yet passed. You need 80 percent.', { exact: false }),
  ).toBeVisible()
  await expect(page.getByText('Attempts remaining: 0 of 2')).toBeVisible()

  // The limit: no further start, and the exact support message.
  await page.goto('/learner/assessments')
  await expect(page.getByText('Attempt limit reached — request support').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Retry' })).toHaveCount(0)

  // An authorised administrator grants one extra attempt with a recorded reason.
  await signInAs(page, ACCOUNTS.admin, '/admin/manage/assessments')
  await page.getByRole('tab', { name: 'Attempts' }).click()
  await page.getByRole('textbox', { name: 'Search learner' }).fill('Samira Hussein')
  await page.getByRole('button', { name: /^View/ }).first().click()
  await page.getByRole('button', { name: /Grant (one )?extra attempt/ }).click()
  const grant = page.getByRole('dialog', { name: 'Grant one extra attempt' })
  await grant.getByRole('textbox').fill('Support request approved after a technical issue')
  await grant.getByRole('button', { name: 'Grant extra attempt' }).click()
  await expect(page.getByText(/extra attempt/i).first()).toBeVisible()

  // Attempt 3 draws a different set; answered correctly it passes.
  await signInAs(page, ID.assessment, '/learner/assessments/post')
  await page.getByRole('button', { name: 'Retry' }).click()
  if (await start.isVisible()) await start.click()
  const third = await answerAssessment(page, 10)
  expect(third.drawn.map((q) => q.code)).not.toEqual(second.drawn.map((q) => q.code))
  await expect(page.getByText('Passed. The pass requirement is 80 percent.')).toBeVisible()
  await expect(page.getByText('Counted score: 100% (best score)')).toBeVisible()

  // The grant is in the audit trail with the reason.
  await signInAs(page, ACCOUNTS.admin, '/admin/manage/audit')
  await expect(
    page.getByText('Support request approved after a technical issue').first(),
  ).toBeVisible()
})

test('check 5: demo clock, renewal, refresher, superseded credential, external CPD', async ({
  page,
}) => {
  // The presenter advances the demo clock (the device date is not changed).
  await signInAs(page, ACCOUNTS.admin, '/admin/manage/certificates')
  const clock = page.getByRole('region', { name: 'Demo clock' })
  await expect(clock).toContainText('27 October 2026')
  await clock.getByRole('spinbutton', { name: 'Advance by (days)' }).fill('20')
  await clock.getByRole('button', { name: 'Advance clock' }).click()
  await expect(clock).toContainText('16 November 2026')
  await expect(clock).toContainText('advanced 20 days')
  await expect(page.getByText(/Reminders created: 1/)).toBeVisible()

  // Mariam's credential is expiring and due for renewal.
  await signInAs(page, ID.mariam, '/learner/record')
  await page.getByRole('tab', { name: 'Certificates and CPD' }).click()
  await expect(page.getByText('Renewal due — 5 days left.')).toBeVisible()
  const cpdBefore = await figure(page, 'Earned and approved')

  // Start renewal: refresher course, renewal check, remaining CPD.
  await page.getByRole('button', { name: 'Start renewal' }).first().click()
  const renewal = page.getByRole('dialog', { name: 'Certificate renewal' })
  await renewal.getByRole('button', { name: 'Start renewal' }).click()
  await expect(renewal.getByText('1. Refresher course (to do)')).toBeVisible()
  await expect(renewal.getByText('2. Renewal check (locked)')).toBeVisible()
  await renewal.getByRole('button', { name: 'Complete refresher' }).click()
  await expect(renewal.getByText('1. Refresher course (done)')).toBeVisible()
  await expect(renewal.getByText('The CPD target for this cycle is met.')).toBeVisible()
  await renewal.getByRole('button', { name: 'Start the check' }).click()
  const check = renewal.getByRole('form', { name: 'Renewal check' })
  for (const [index, question] of RENEWAL_CHECK_QUESTIONS.entries()) {
    const copy = record.renewal.check[question.id as 'q1']
    const prompt = `${index + 1}. ${copy.prompt}`
    const text = copy[question.correct as 'a']
    await check.getByRole('group', { name: prompt }).getByRole('radio', { name: text }).check()
  }
  await check.getByRole('button', { name: 'Submit answers' }).click()
  const finish = renewal.getByRole('button', { name: 'Complete renewal and issue new credential' })
  await expect(finish).toBeEnabled()
  await finish.click()
  await expect(renewal.getByText(/^Renewed: new credential QTA-DEMO-A-/)).toBeVisible()
  await expect(
    renewal.getByText('Your earlier certificate is kept in your record as Superseded.'),
  ).toBeVisible()
  await page.keyboard.press('Escape')

  // The old credential is kept as Superseded; the new one is Active and linked to it.
  await page.reload()
  await page.getByRole('tab', { name: 'Certificates and CPD' }).click()
  await expect(page.getByText('QTA-DEMO-A-P25-0001')).toBeVisible()
  await expect(page.getByText('Superseded', { exact: true })).toBeVisible()
  await expect(page.getByText('Active', { exact: true }).first()).toBeVisible()
  expect(await figure(page, 'Earned and approved')).toBeGreaterThan(cpdBefore)

  // External certificate: submit, stays Pending review and adds no approved CPD.
  const approvedBefore = await figure(page, 'Earned and approved')
  await page.getByRole('tab', { name: 'External Certificates' }).click()
  await page.getByRole('button', { name: 'Add certificate' }).click()
  const form = page.getByRole('dialog', { name: 'Add an external certificate' })
  await form
    .getByRole('textbox', { name: 'Certificate title' })
    .fill('Heritage Interpretation Basics')
  await form.getByRole('textbox', { name: 'Issuer' }).fill('Demo Heritage Society')
  await form.getByRole('textbox', { name: 'External reference' }).fill('DHS-HIB-0042')
  await form.getByRole('textbox', { name: 'Issue date' }).fill('2026-09-15')
  await form.getByRole('textbox', { name: 'Expiry date' }).fill('2028-09-15')
  await form.getByRole('spinbutton', { name: 'Claimed CPD amount' }).fill('2')
  await form.getByRole('button', { name: 'Use sample file' }).click()
  await form.getByRole('button', { name: 'Submit for review' }).click()
  const submitted = page.getByText('Heritage Interpretation Basics')
  await expect(submitted).toBeVisible()
  await expect(page.getByText('Pending review').first()).toBeVisible()
  await page.getByRole('tab', { name: 'Certificates and CPD' }).click()
  expect(await figure(page, 'Earned and approved')).toBe(approvedBefore)

  // The administrator approves it with the recognised amount; the ledger counts it once.
  await signInAs(page, ACCOUNTS.admin, '/admin/manage/approvals')
  const external = page.getByRole('row', { name: /Heritage Interpretation Basics/ })
  await external.getByRole('button', { name: 'Approve' }).click()
  const approve = page.getByRole('dialog', { name: /^Approve REQ-/ })
  await approve.getByRole('spinbutton', { name: /Recognised CPD/ }).fill('2')
  await approve.getByRole('button', { name: 'Approve', exact: true }).click()
  await expect(page.getByRole('row', { name: /Heritage Interpretation Basics/ })).toContainText(
    'Approved',
  )

  await signInAs(page, ID.mariam, '/learner/record')
  await page.getByRole('tab', { name: 'Certificates and CPD' }).click()
  const approvedAfter = await figure(page, 'Earned and approved')
  expect(approvedAfter).toBe(approvedBefore + 2)
  await page.reload()
  await page.getByRole('tab', { name: 'Certificates and CPD' }).click()
  expect(await figure(page, 'Earned and approved')).toBe(approvedAfter)
  await expect(
    page.getByRole('row', { name: /Heritage Interpretation Basics.*External/ }),
  ).toHaveCount(1)
})

const ILLUSTRATIVE =
  'Illustrative configuration. Hosting region, access policies, SSO provider and API settings are configurable and subject to technical review. No live Qatar Tourism systems are connected.'
const CRM_COPY =
  'Customisable two-way integration. Data and events can flow from CRM to LMS and from LMS to CRM. Fields, triggers, direction, approvals and source-of-truth rules can be configured to match your workflows. This demonstration uses simulated data.'

test('check 6: hosting and SSO settings, CRM scenario in both directions, mapping error retried', async ({
  page,
}) => {
  await signInAs(page, ACCOUNTS.admin, '/admin/manage/integrations')
  await expect(pageHeading(page)).toHaveText('Integrations and Security')
  await expect(page.getByText(ILLUSTRATIVE, { exact: true })).toBeVisible()
  for (const name of ['Overview', 'SSO', 'API Access', 'Content Hosting', 'Data Residency']) {
    await expect(page.getByRole('tab', { name, exact: true })).toBeVisible()
  }

  // Content hosting and data residency: nothing is confirmed.
  await page.getByRole('tab', { name: 'Content Hosting' }).click()
  const hosting = page.getByRole('tabpanel', { name: 'Content Hosting' })
  await expect(hosting).toContainText('wvq-ar-scorm2004')
  await expect(hosting).toContainText('Authenticated launch')
  await expect(hosting).toContainText('Illustrative address. It does not resolve.')
  await page.getByRole('tab', { name: 'Data Residency' }).click()
  const residency = page.getByRole('tabpanel', { name: 'Data Residency' })
  for (const row of [
    'LMS records',
    'Uploaded content',
    'Backups',
    'Logs',
    'Learning record store',
    'AI and voice processing',
  ]) {
    await expect(residency.getByText(row, { exact: true })).toBeVisible()
  }
  await expect(residency).toContainText(
    'Hosting region and provider are handover items for Qatar Tourism.',
  )

  // Access previews: learner allowed, unassigned learner and signed-out visitor denied.
  await page.getByRole('tab', { name: 'Overview' }).click()
  await page.getByRole('button', { name: 'Preview as learner' }).click()
  await page.getByRole('button', { name: 'Try an unassigned learner' }).click()
  await page.getByRole('button', { name: 'Preview as signed-out visitor' }).click()
  await page.getByRole('button', { name: 'Preview as external trainer' }).click()
  const audit = page.getByRole('region', { name: /Audit trail/ }).or(page.getByRole('main'))
  await expect(audit).toContainText(
    'Authorised: the assigned lesson opens through an authenticated launch.',
  )
  await expect(audit).toContainText('Access denied: this learner is not assigned to this content.')
  await expect(audit).toContainText(
    'Sign in to continue. Protected content does not open for a signed-out visitor.',
  )
  await expect(audit).toContainText(
    'The trainer sees only assigned cohorts and authorised content, with restricted exports.',
  )

  // SSO: the test hands over to a mock identity provider; failure first, then retry.
  await page.getByRole('tab', { name: 'SSO' }).click()
  await expect(page.getByText('Not configured')).toBeVisible()
  await page.getByRole('button', { name: 'Test sign in' }).first().click()
  const idp = page.getByRole('dialog', { name: 'Sign in to continue to the Academy' })
  await expect(idp).toContainText('Mariam Al Nuaimi')
  await idp.getByRole('button', { name: 'Simulate failed login' }).click()
  await expect(
    page.getByText('Test failed. The identity provider declined the sign in (simulated failure).'),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Retry' }).click()
  await page
    .getByRole('dialog', { name: 'Sign in to continue to the Academy' })
    .getByRole('button', { name: 'Continue as Mariam' })
    .click()
  await expect(
    page.getByText('Signed back in to the same Academy account (LRN-0042).', { exact: false }),
  ).toBeVisible()
  await expect(page.getByText('no duplicate profile was created', { exact: false })).toBeVisible()

  // CRM: the scenario runs CRM to LMS (steps 1 and 7) and LMS to CRM (step 6).
  await page.getByRole('tab', { name: 'CRM Integration' }).click()
  await expect(page.getByText(CRM_COPY, { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Run scenario' }).click()
  await page.getByRole('button', { name: 'Advance to step 1' }).click()
  await expect(
    page
      .getByText(
        'Sync paused: CRM programme code QT-A does not have an LMS mapping. Select Program A, preview the change and retry.',
      )
      .first(),
  ).toBeVisible()

  // Cause, correct, retry: the mapping is fixed once and the event processed without a duplicate.
  await page.getByRole('button', { name: 'Resolve mapping' }).first().click()
  const fix = page.getByRole('dialog', { name: 'Resolve mapping' })
  await fix.getByRole('combobox', { name: 'LMS programme for QT-A' }).click()
  await page.getByRole('option', { name: 'Program A' }).click()
  await expect(fix).toContainText(
    'already has a Program A enrolment: it would be updated; no duplicate record is created.',
  )
  await fix.getByRole('button', { name: 'Save mapping' }).click()
  await fix.getByRole('button', { name: 'Retry event' }).click()
  await expect(
    fix.getByText('Event processed. Existing enrolment updated; no duplicate record created.'),
  ).toBeVisible()
  await fix.getByRole('button', { name: 'Close' }).first().click()

  // The remaining steps: each gate is checked, never skipped silently.
  await page.getByRole('button', { name: 'Advance to step 1' }).click()
  await page.getByRole('button', { name: 'Advance to step 2' }).click()
  await expect(
    page.getByText(/Enrolment approved: the learner is approved for Program A/).first(),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Advance to step 3' }).click()
  await expect(
    page.getByText(/Gate not met. Required learning is not complete/).first(),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Continue with simulated evidence' }).click()
  await page.getByRole('button', { name: 'Advance to step 4' }).click()
  await expect(page.getByText(/Post-assessment \(80 percent to pass\)/).first()).toBeVisible()
  await page.getByRole('button', { name: 'Advance to step 5' }).click()
  await expect(page.getByText(/no certificate record was created/).first()).toBeVisible()
  await page.getByRole('button', { name: 'Advance to step 6' }).click()
  await expect(page.getByText(/events were delivered to the CRM/).first()).toBeVisible()
  await page.getByRole('combobox', { name: 'CRM licence decision' }).click()
  await page.getByRole('option', { name: 'Active' }).click()
  await page.getByRole('button', { name: 'Advance to step 7' }).click()
  await expect(page.getByRole('button', { name: 'Scenario complete' })).toBeDisabled()
  const steps = page.getByRole('list').filter({ hasText: 'CRM sends Program A enrolment' })
  await expect(steps).toContainText('CRM to LMS · Done')
  await expect(steps).toContainText('LMS to CRM · Done')
  await expect(
    page.getByText('Source: CRM decision. Training results do not grant a licence.'),
  ).toBeVisible()

  // No duplicates: the sync log holds the event once, and Mariam still has one Program A enrolment.
  await page.getByRole('tab', { name: 'Sync Log' }).click()
  const log = page.getByRole('tabpanel', { name: 'Sync Log' })
  await expect(log.getByRole('row', { name: /EVT-0005/ })).toHaveCount(1)
  await expect(log.getByRole('row', { name: /EVT-0005/ })).toContainText('Processed')
  await page.goto(`/admin/manage/users/${ID.mariam}`)
  await expect(page.getByRole('listitem').filter({ hasText: /^Program A/ })).toHaveCount(1)
})

/** A dashboard count read from the main text, e.g. "4 Pending approvals". */
async function dashboardCount(page: Page, label: string) {
  const read = async () => {
    // biome-ignore lint/performance/useDomNodeTextContent: line breaks between blocks matter to the pattern
    const text = (await page.getByRole('main').innerText()).replace(/,/g, '')
    const match = new RegExp(`(\\d+)\\s+${label}`).exec(text)
    return match ? Number(match[1]) : Number.NaN
  }
  await expect.poll(read).not.toBeNaN()
  return read()
}

/** A report summary tile ("Pending review 5") read from the main text. */
async function reportTile(page: Page, label: string) {
  const read = async () => {
    // biome-ignore lint/performance/useDomNodeTextContent: line breaks between blocks matter to the pattern
    const text = (await page.getByRole('main').innerText()).replace(/,/g, '')
    const match = new RegExp(`${label}\\s+(\\d+)`).exec(text)
    return match ? Number(match[1]) : Number.NaN
  }
  // The label also appears in the page description, so wait for the tile's number.
  await expect.poll(read).not.toBeNaN()
  return read()
}

/** Asks AI Analytics one of the suggested questions and returns the answer text. */
async function askAnalytics(page: Page, question: string) {
  await page.goto('/admin/ai-analytics')
  // The chat keeps earlier questions: start clean so the answer on screen is this one.
  const fresh = page.getByRole('button', { name: 'New conversation' })
  if (await fresh.isEnabled()) await fresh.click()
  await page.getByRole('button', { name: question }).first().click()
  const results = page.getByRole('main')
  await expect(results.getByText(/Shown? in the results canvas/).first()).toBeVisible()
  await expect(results.getByText('Applied filters')).toBeVisible()
  // Wait for the answer itself, not only the canvas frame.
  await expect
    // biome-ignore lint/performance/useDomNodeTextContent: line breaks between blocks matter to the patterns
    .poll(async () => (await results.innerText()).includes('Sample size'))
    .toBe(true)
  // biome-ignore lint/performance/useDomNodeTextContent: line breaks between blocks matter to the patterns
  return (await results.innerText()) ?? ''
}

test('check 7: dashboard counts, reports and AI Analytics agree; reset repeats the key paths', async ({
  page,
}) => {
  await signInAs(page, ACCOUNTS.admin, '/admin')
  await expect(page.getByRole('button', { name: /^A certificates issued/ })).toBeVisible()
  await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(0, { timeout: 15_000 })
  // The original totals are kept.
  await expect(page.getByRole('button', { name: /^Unique learners/ })).toContainText('1,200')

  // Certificates expiring within 30 days (the demo clock is still advanced): certification report
  // = AI Analytics. The renewed credential no longer counts as expiring.
  await page.goto('/admin/reports/certification')
  const expiringReport = await reportTile(page, 'Expiring soon')
  const expiring = await askAnalytics(
    page,
    'Which learners have certificates expiring in the next 30 days?',
  )
  const expiringAnswer = Number(
    /(\d+)\s+learners?\s+(?:has|have)\s+a\s+current\s+certificate/.exec(expiring)?.[1] ?? 0,
  )
  expect(expiringAnswer).toBe(expiringReport)

  // Back to the seed date, so the waitlisted session is upcoming again.
  await page.goto('/admin/manage/certificates')
  await page.getByRole('button', { name: 'Reset clock' }).click()
  await expect(page.getByRole('region', { name: 'Demo clock' })).toContainText('not advanced')

  await page.goto('/admin')
  await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(0, { timeout: 15_000 })
  const dashboard = {
    pending: await dashboardCount(page, 'Pending approvals'),
    waitlisted: await dashboardCount(page, 'Waitlisted learners'),
    locked: await dashboardCount(page, 'Locked accounts'),
    crmFailed: await dashboardCount(page, 'Failed events'),
  }
  // After checks 3 to 6: three learners wait (the cancelled seat went to the first), one is locked.
  expect(dashboard.waitlisted).toBe(3)
  expect(dashboard.locked).toBe(1)

  // Pending approvals: the dashboard count opens the filtered list and equals the report.
  await page.getByRole('link', { name: 'Open pending approvals' }).click()
  await expect(page).toHaveURL(/\/admin\/manage\/approvals\?status=pending/)
  await expect(page.getByText(`${dashboard.pending} requests`)).toBeVisible()
  await page.goto('/admin/reports/approvals')
  expect(await reportTile(page, 'Pending review')).toBe(dashboard.pending)

  // Waitlist: dashboard = report = AI Analytics.
  await page.goto('/admin/reports/waitlist')
  expect(await reportTile(page, 'Learners waiting')).toBe(dashboard.waitlisted)
  const waiting = await askAnalytics(page, 'How many learners are waiting for Program A sessions?')
  expect(
    Number(
      /(\d+)\s+learners?\s+(?:are|is)\s+waiting\s+for\s+Program\s+A\s+sessions/.exec(waiting)?.[1],
    ),
  ).toBe(dashboard.waitlisted)
  expect(waiting).toContain('Programme: Program A')

  // Locked accounts.
  await page.goto('/admin/reports/account-status')
  expect(await reportTile(page, 'Locked')).toBe(dashboard.locked)

  // CRM events: dashboard card = sync report = AI Analytics.
  await page.goto('/admin/reports/crm-sync')
  expect(await reportTile(page, 'Failed or conflict')).toBe(dashboard.crmFailed)
  const failed = await askAnalytics(page, 'Which CRM events failed?')
  expect(Number(/(\d+)\s+simulated\s+CRM\s+events?\s+need\s+attention/.exec(failed)?.[1])).toBe(
    dashboard.crmFailed,
  )

  // Assessment pass rates: AI Analytics (post, by programme and language) = Assessment Results.
  const rates = await askAnalytics(page, 'Show assessment pass rates by programme and language')
  const aiRate = Math.round(Number(/\((\d+(?:\.\d)?)%\)/.exec(rates)?.[1]))
  await page.goto('/admin/reports/assessment-results')
  await expect(page.getByRole('main')).toContainText('Pass rate (post)')
  expect(await reportTile(page, 'Pass rate \\(post\\)')).toBe(aiRate)

  // Reset the demo: the seed state, queue, approvals, attempts and clock come back.
  await resetDemoThroughUi(page)
  await signInAs(page, ACCOUNTS.admin, '/admin/manage/certificates')
  await expect(page.getByRole('region', { name: 'Demo clock' })).toContainText('27 October 2026')
  await expect(page.getByRole('region', { name: 'Demo clock' })).toContainText('not advanced')
  await signInAs(page, ACCOUNTS.admin, '/admin')
  await expect(page.getByRole('button', { name: /^A certificates issued 122/ })).toBeVisible()
  expect(await dashboardCount(page, 'Pending approvals')).toBe(5)
  expect(await dashboardCount(page, 'Waitlisted learners')).toBe(3)

  // A key path repeats: Mariam's credential is expiring again, and the waitlist is joinable again.
  await signInAs(page, ID.mariam, '/learner/record')
  await page.getByRole('tab', { name: 'Certificates and CPD' }).click()
  await expect(page.getByText('QTA-DEMO-A-P25-0001')).toBeVisible()
  await expect(page.getByText('Renewal due — 25 days left.')).toBeVisible()
  await signInAs(page, ID.joiner, '/learner/sessions')
  await page.getByRole('button', { name: /^Handling a changed booking, SES-T03-2/ }).click()
  await page
    .getByRole('dialog', { name: 'Handling a changed booking' })
    .getByRole('button', { name: 'Session full — join waitlist' })
    .click()
  await expect(page.getByRole('region', { name: 'Your bookings' })).toContainText(
    'Waitlist position 4',
  )
})
