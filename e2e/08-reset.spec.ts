import { expect, test } from '@playwright/test'
import { apiAs, getJson, resetDemo } from './support/api'
import { ACCOUNTS, API_URL, CLIENT_ORIGIN } from './support/env'
import { signInAs } from './support/ui'

/**
 * Demonstration resilience (brief §17): the named reset, restricted to the demo administrator,
 * returns the demo to its snapshot, and a reset reproduces identical dashboard numbers.
 * Runs last, so the suite leaves the demo in its starting state.
 */
type Overview = {
  kpis: Record<string, number>
  distribution: unknown
  funnels: unknown
  improvement: unknown
  attendance: unknown
  trend: unknown
}

const comparable = (o: Overview) => ({
  kpis: o.kpis,
  distribution: o.distribution,
  funnels: o.funnels,
  improvement: o.improvement,
  attendance: o.attendance,
  trend: o.trend,
})

test('the named reset restores the snapshot and reproduces identical dashboard numbers', async ({
  page,
}) => {
  // Through the UI, with confirmation.
  await signInAs(page, ACCOUNTS.admin, '/admin/manage/audit')
  await page.getByRole('button', { name: 'Reset demo data' }).click()
  const confirm = page
    .getByRole('alertdialog', { name: 'Reset demo data?' })
    .or(page.getByRole('dialog', { name: 'Reset demo data?' }))
  await expect(confirm).toContainText('resets all fictional demo data to the original snapshot')
  await confirm.getByRole('button', { name: 'Reset demo data' }).click()
  await expect(page.getByText('Demo data reset')).toBeVisible({ timeout: 60_000 })

  const admin = await apiAs(ACCOUNTS.admin)
  const first = comparable(await getJson<Overview>(admin, '/analytics/overview'))
  expect(first.kpis).toMatchObject({
    uniqueLearners: 1200,
    enrolments: 1260,
    certificates: 120,
  })

  await resetDemo(admin)
  const second = comparable(await getJson<Overview>(admin, '/analytics/overview'))
  expect(second).toEqual(first)

  // A learner cannot run the reset.
  const learner = await apiAs(ACCOUNTS.maha)
  const denied = await learner.post(`${API_URL}/api/demo/reset`, {
    headers: { Origin: CLIENT_ORIGIN },
    data: { confirm: true },
  })
  expect(denied.status()).toBe(403)
  await Promise.all([admin.dispose(), learner.dispose()])

  // The dashboard shows the snapshot totals.
  await page.goto('/admin')
  await expect(page.getByRole('button', { name: /^A certificates issued 120/ })).toBeVisible()
})
