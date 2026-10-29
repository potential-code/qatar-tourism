import type { Page } from '@playwright/test'
import { ACCOUNTS } from './support/env'
import { signInAs } from './support/ui'
import { expect, test } from './support/walkthrough'

/**
 * Demonstration resilience (brief §17): the named reset, run by the demo administrator in the
 * admin UI, returns this browser's demo data to the snapshot, and running it again reproduces
 * identical dashboard numbers. Runs after the walkthrough in the same browser, so the reset
 * undoes Omar's certificate (121 back to 120) and the registered visitor.
 */

async function resetThroughUi(page: Page) {
  await signInAs(page, ACCOUNTS.admin, '/admin/manage/audit')
  await page.getByRole('button', { name: 'Reset demo data' }).click()
  const confirm = page
    .getByRole('alertdialog', { name: 'Reset demo data?' })
    .or(page.getByRole('dialog', { name: 'Reset demo data?' }))
  await expect(confirm).toContainText('resets all fictional demo data to the original snapshot')
  await confirm.getByRole('button', { name: 'Reset demo data' }).click()
  await expect(page.getByText('Demo data reset').first()).toBeVisible({ timeout: 60_000 })
}

/** The admin Dashboard's KPI tiles and charts, as text, once every view has loaded. */
async function dashboardNumbers(page: Page) {
  await signInAs(page, ACCOUNTS.admin, '/admin')
  await expect(page.getByRole('button', { name: /^A certificates issued/ })).toBeVisible()
  await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(0, { timeout: 15_000 })
  return page.getByRole('main').textContent()
}

test('the named reset restores the snapshot and reproduces identical dashboard numbers', async ({
  page,
}) => {
  // The walkthrough changed the totals in this browser.
  await signInAs(page, ACCOUNTS.admin, '/admin')
  await expect(page.getByRole('button', { name: /^A certificates issued 121/ })).toBeVisible()

  await resetThroughUi(page)
  const first = await dashboardNumbers(page)
  await expect(page.getByRole('button', { name: /^A certificates issued 120/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Unique learners/ })).toContainText('1,200')
  await expect(page.getByRole('button', { name: /^Enrolments 1260/ })).toBeVisible()

  await resetThroughUi(page)
  const second = await dashboardNumbers(page)
  expect(second).toEqual(first)

  // A reload reads the reset data back from IndexedDB.
  await page.reload()
  await expect(page.getByRole('button', { name: /^A certificates issued 120/ })).toBeVisible()
})

test('a learner cannot see or reach the reset', async ({ page }) => {
  await signInAs(page, ACCOUNTS.maha, '/admin/manage/audit')
  await expect(page).toHaveURL(/\/learner$/)
  await expect(page.getByRole('button', { name: 'Reset demo data' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Demo toolbar/ })).toHaveCount(0)
})
