import { expect, type Page } from '@playwright/test'

/**
 * The demo facilitator toolbar (brief §3): the admin signs in once, then switches between the
 * seeded personas, trainers and admin as the walkthrough moves between roles. Everything
 * happens in one browser, so each role sees the others' changes.
 */
export async function switchTo(page: Page, name: string, landing: RegExp) {
  await page.getByRole('button', { name: /^Demo toolbar/ }).click()
  await page.getByRole('menuitem', { name: new RegExp(`^${name}`) }).click()
  await expect(page.getByText(`Signed in as ${name} for the demo.`)).toBeVisible()
  await expect(page).toHaveURL(landing)
}
