import { expect, test } from '@playwright/test'
import { apiAs, getJson, ORIGIN_HEADERS } from './support/api'
import { ACCOUNTS, API_URL } from './support/env'
import { signInAs } from './support/ui'

/**
 * Brief §11 and §18 permissions: portal routes redirect a wrong role, and the API is the real
 * check. A learner gets 403 from trainer and admin APIs and cannot escalate their role; Trainer 1
 * gets 403 for Trainer 2's roster, whatever the URL says.
 */
type SessionList = { items: { id: string; code: string }[] }

test('a learner cannot reach the trainer or admin portals', async ({ page }) => {
  await signInAs(page, ACCOUNTS.maha, '/trainer')
  await expect(page).toHaveURL(/\/learner$/)
  await page.goto('/admin/reports/program-a')
  await expect(page).toHaveURL(/\/learner$/)
  await page.goto('/admin/manage/audit')
  await expect(page).toHaveURL(/\/learner$/)
})

test('a learner gets 403 from trainer and admin APIs and cannot escalate', async () => {
  const admin = await apiAs(ACCOUNTS.admin)
  const sessions = await getJson<SessionList>(admin, '/sessions')
  const t01 = sessions.items.find((s) => s.code === 'SES-T01-2')
  expect(t01).toBeDefined()

  const learner = await apiAs(ACCOUNTS.maha)
  for (const path of [
    `/attendance/sessions/${t01?.id}/roster`,
    `/exports/sessions/${t01?.id}/marks`,
    '/assignments/marking',
    '/admin/users',
    '/analytics/overview',
    '/reports/program-a',
    '/audit',
  ]) {
    const response = await learner.get(`${API_URL}/api${path}`, { headers: ORIGIN_HEADERS })
    expect(response.status(), path).toBe(403)
  }
  const escalate = await learner.patch(`${API_URL}/api/admin/users/user-l0001/role`, {
    headers: ORIGIN_HEADERS,
    data: { role: 'admin', reason: 'Trying to escalate' },
  })
  expect(escalate.status()).toBe(403)
  const me = await getJson<{ role?: string; user?: { role?: string } }>(learner, '/me')
  expect(me.user?.role ?? me.role).toBe('learner')
  await Promise.all([admin.dispose(), learner.dispose()])
})

test("Trainer 1 gets 403 for Trainer 2's roster, in the API and on screen", async ({ page }) => {
  const admin = await apiAs(ACCOUNTS.admin)
  const sessions = await getJson<SessionList>(admin, '/sessions')
  const t02 = sessions.items.find((s) => s.code === 'SES-T02-2')
  expect(t02).toBeDefined()
  await admin.dispose()

  const trainer = await apiAs(ACCOUNTS.trainer(1))
  for (const path of [
    `/attendance/sessions/${t02?.id}/roster`,
    `/exports/sessions/${t02?.id}/marks`,
    `/sessions/${t02?.id}`,
  ]) {
    const response = await trainer.get(`${API_URL}/api${path}`, { headers: ORIGIN_HEADERS })
    expect(response.status(), path).toBe(403)
  }
  await trainer.dispose()

  // Changing the ID in the URL shows an access message, never the other trainer's learners.
  await signInAs(page, ACCOUNTS.trainer(1), `/trainer/attendance/${t02?.id}`)
  await expect(page.getByRole('table')).toHaveCount(0)
  await expect(page.getByText(/permission|not assigned|access/i).first()).toBeVisible()
})
