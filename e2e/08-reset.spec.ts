import type { Page } from '@playwright/test'
import { ACCOUNTS } from './support/env'
import { resetDemoThroughUi, signInAs } from './support/ui'
import { expect, test } from './support/walkthrough'

/**
 * Demonstration resilience (brief §17): the named reset, run by the demo administrator in the
 * admin UI, returns this browser's demo data to the snapshot, and running it again reproduces
 * identical dashboard numbers. Runs after the walkthrough in the same browser, so the reset
 * undoes Omar's certificate (123 back to 122) and the registered visitor.
 */

const resetThroughUi = resetDemoThroughUi

/** The admin Dashboard's KPI tiles and charts, as text, once every view has loaded. */
async function dashboardNumbers(page: Page) {
  await signInAs(page, ACCOUNTS.admin, '/admin')
  await expect(page.getByRole('button', { name: /^A certificates issued/ })).toBeVisible()
  await expect(page.locator('[data-slot="skeleton"]')).toHaveCount(0, { timeout: 15_000 })
  // Chart styles carry React's generated ids (chart-_r_1k_), which differ per render: drop them.
  const text = await page.getByRole('main').textContent()
  return text?.replace(/chart-_r_[a-z0-9]+_/g, 'chart') ?? null
}

test('the named reset restores the snapshot and reproduces identical dashboard numbers', async ({
  page,
}) => {
  // The walkthrough changed the totals in this browser.
  await signInAs(page, ACCOUNTS.admin, '/admin')
  await expect(page.getByRole('button', { name: /^A certificates issued 123/ })).toBeVisible()

  await resetThroughUi(page)
  const first = await dashboardNumbers(page)
  await expect(page.getByRole('button', { name: /^A certificates issued 122/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Unique learners/ })).toContainText('1,200')
  await expect(page.getByRole('button', { name: /^Enrolments 1260/ })).toBeVisible()

  await resetThroughUi(page)
  const second = await dashboardNumbers(page)
  expect(second).toEqual(first)

  // A reload reads the reset data back from IndexedDB.
  await page.reload()
  await expect(page.getByRole('button', { name: /^A certificates issued 122/ })).toBeVisible()
})

test('a learner cannot see or reach the reset', async ({ page }) => {
  await signInAs(page, ACCOUNTS.maha, '/admin/manage/audit')
  await expect(page).toHaveURL(/\/learner$/)
  await expect(page.getByRole('button', { name: 'Reset demo data' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Demo toolbar/ })).toHaveCount(0)
})
