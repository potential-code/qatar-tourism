import { expect, type Page } from '@playwright/test'
import { DEMO_PASSWORD } from './env'

/**
 * The app saves its in-browser database to IndexedDB 250 ms after the last change. Waiting a
 * little longer before a full page load means the reload never drops the last change.
 */
export const SAVE_SETTLE_MS = 500

export async function waitForSave(page: Page) {
  await page.waitForTimeout(SAVE_SETTLE_MS)
}

/** Opens `path` signed in as a seeded account, through the `?demo-as=<userId>` deep link. */
export async function signInAs(page: Page, userId: string, path = '/') {
  const url = new URL(path, 'http://e2e.local')
  url.searchParams.set('demo-as', userId)
  await waitForSave(page)
  await page.goto(`${url.pathname}${url.search}`)
}

/** Signs out through the account menu, if anyone is signed in. Ends on the sign-in page. */
export async function signOut(page: Page) {
  await waitForSave(page)
  await page.goto('/login')
  const signIn = page.getByRole('button', { name: 'Sign in', exact: true })
  const account = page.getByRole('button', { name: /, account menu$/ })
  await expect(signIn.or(account)).toBeVisible()
  if (await signIn.isVisible()) return
  await account.click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/login/)
  await expect(signIn).toBeVisible()
}

/** Signs out, then signs in through the real form (used where the journey itself shows sign-in). */
export async function signInWithForm(page: Page, email: string, mode?: 'trainer' | 'admin') {
  await signOut(page)
  await page.goto(mode ? `/login?mode=${mode}` : '/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
}

/** The page's main heading (h1). */
export function pageHeading(page: Page) {
  return page.getByRole('heading', { level: 1 })
}

/** The administrator runs "Reset demo data" in Audit and demo reset and waits for the confirmation. */
export async function resetDemoThroughUi(page: Page, adminId = 'user-admin') {
  await signInAs(page, adminId, '/admin/manage/audit')
  await page.getByRole('button', { name: 'Reset demo data' }).click()
  const confirm = page
    .getByRole('alertdialog', { name: 'Reset demo data?' })
    .or(page.getByRole('dialog', { name: 'Reset demo data?' }))
  await expect(confirm).toContainText('resets all fictional demo data to the original snapshot')
  await confirm.getByRole('button', { name: 'Reset demo data' }).click()
  await expect(page.getByText('Demo data reset').first()).toBeVisible({ timeout: 60_000 })
}
