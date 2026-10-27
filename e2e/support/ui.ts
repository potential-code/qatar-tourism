import { expect, type Page } from '@playwright/test'
import { API_URL, CLIENT_ORIGIN, DEMO_PASSWORD } from './env'

/** Sign in through the API inside the page's browser context, then open a path. */
export async function signInAs(page: Page, email: string, path?: string) {
  await page.context().clearCookies()
  const response = await page.request.post(`${API_URL}/api/auth/sign-in/email`, {
    headers: { Origin: CLIENT_ORIGIN },
    data: { email, password: DEMO_PASSWORD },
  })
  expect(response.status(), `sign in ${email}`).toBe(200)
  if (path) await page.goto(path)
}

/** Sign in through the real form (used where the journey itself shows sign-in). */
export async function signInWithForm(page: Page, email: string, mode?: 'trainer' | 'admin') {
  await page.context().clearCookies()
  await page.goto(mode ? `/login?mode=${mode}` : '/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(DEMO_PASSWORD)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
}

/** The page's main heading (h1). */
export function pageHeading(page: Page) {
  return page.getByRole('heading', { level: 1 })
}

/** Uncaught page errors fail the test that caused them. */
export function trackPageErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  return errors
}
