import { expect, test } from '@playwright/test'
import { ACCOUNTS, EMAILS } from './support/env'
import { signInAs, signInWithForm, signOut } from './support/ui'

/**
 * Brief §11 and §18 permissions in the frontend-only mockup. Route guards redirect a wrong
 * role, and the browser services refuse out-of-scope reads, so a changed URL shows an access
 * message, never another trainer's learners. The same rules are covered by the service tests
 * (client/src/services/__tests__, see docs/PERMISSIONS.md). Each test has its own browser, so
 * it starts from the seed.
 */

test('a learner is sent back to their portal from trainer and admin URLs', async ({ page }) => {
  await signInAs(page, ACCOUNTS.maha, '/trainer')
  await expect(page).toHaveURL(/\/learner$/)
  for (const path of [
    '/trainer/attendance',
    '/trainer/assignments',
    '/admin',
    '/admin/users',
    '/admin/reports/program-a',
    '/admin/manage/audit',
  ]) {
    await page.goto(path)
    await expect(page, path).toHaveURL(/\/learner$/)
  }
  // Nothing on the learner's screens offers trainer or admin tools.
  await expect(page.getByRole('button', { name: 'Reset demo data' })).toHaveCount(0)
})

test('the Trainer sign-in mode works but never grants trainer access', async ({ page }) => {
  await signInWithForm(page, EMAILS.maha, 'trainer')
  await expect(page).toHaveURL(/\/learner/)
  await page.goto('/login?mode=trainer')
  await expect(page).toHaveURL(/\/learner/)

  // Signed out, the connected sign-in options are labelled simulated.
  await signOut(page)
  await page.goto('/login?mode=trainer')
  await expect(page.getByText('Choosing this mode does not grant trainer access.')).toBeVisible()
  const sso = page.getByRole('region', { name: 'Or use connected sign-in' })
  await expect(sso.getByRole('button', { name: /Simulated$/ })).toHaveCount(2)
})

test('the facilitator switch is for the demo administrator only', async ({ page }) => {
  // A learner signed in with the form has no demo toolbar.
  await signInWithForm(page, EMAILS.maha)
  await expect(page).toHaveURL(/\/learner/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Demo toolbar/ })).toHaveCount(0)

  // A trainer has none either.
  await signInWithForm(page, EMAILS.trainer(1), 'trainer')
  await expect(page).toHaveURL(/\/trainer/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Demo toolbar/ })).toHaveCount(0)

  // The administrator has it, and keeps it while viewing as a persona.
  await signInWithForm(page, EMAILS.admin, 'admin')
  await expect(page).toHaveURL(/\/admin/)
  const toolbar = page.getByRole('button', { name: /^Demo toolbar/ })
  await expect(toolbar).toBeVisible()
  await toolbar.click()
  await page.getByRole('menuitem', { name: /^Maha/ }).click()
  await expect(page).toHaveURL(/\/learner/)
  await expect(toolbar).toBeVisible()
})

test("Trainer 1 sees an access message on Trainer 2's session and roster URLs", async ({
  page,
}) => {
  // Trainer 2 finds the id of one of their own sessions.
  await signInAs(page, ACCOUNTS.trainer(2), '/trainer/sessions')
  await page
    .getByRole('link', { name: /SES-T02-2/ })
    .first()
    .click()
  await expect(page).toHaveURL(/\/trainer\/sessions\/[^/]+$/)
  const sessionId = page.url().split('/').pop() ?? ''
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  // Trainer 1 pastes the same id into both URLs: an access message, never the learners.
  for (const path of [`/trainer/attendance/${sessionId}`, `/trainer/sessions/${sessionId}`]) {
    await signInAs(page, ACCOUNTS.trainer(1), path)
    await expect(page.getByText(/permission|not assigned|access/i).first(), path).toBeVisible()
    await expect(page.getByRole('table'), path).toHaveCount(0)
    await expect(page.getByText('Export personal data'), path).toHaveCount(0)
  }
})
