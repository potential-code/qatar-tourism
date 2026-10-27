import { type APIRequestContext, expect, request } from '@playwright/test'
import { API_URL, CLIENT_ORIGIN, DEMO_PASSWORD } from './env'

/**
 * Direct API helpers. The browser journeys use the UI; these only sign in, reset the demo and
 * read totals to compare against what the screens show.
 */
export const ORIGIN_HEADERS = { Origin: CLIENT_ORIGIN }

export async function signInApi(ctx: APIRequestContext, email: string) {
  const response = await ctx.post(`${API_URL}/api/auth/sign-in/email`, {
    headers: ORIGIN_HEADERS,
    data: { email, password: DEMO_PASSWORD },
  })
  expect(response.status(), `sign in ${email}`).toBe(200)
}

export async function apiAs(email: string) {
  const ctx = await request.newContext({ extraHTTPHeaders: ORIGIN_HEADERS })
  await signInApi(ctx, email)
  return ctx
}

export async function getJson<T = unknown>(ctx: APIRequestContext, path: string): Promise<T> {
  const response = await ctx.get(`${API_URL}/api${path}`, { headers: ORIGIN_HEADERS })
  expect(response.status(), `GET ${path}`).toBe(200)
  return (await response.json()) as T
}

/** The named demo reset (brief §17), as the demo administrator. */
export async function resetDemo(admin: APIRequestContext) {
  const response = await admin.post(`${API_URL}/api/demo/reset`, {
    headers: ORIGIN_HEADERS,
    data: { confirm: true },
    timeout: 120_000,
  })
  expect(response.status(), 'demo reset').toBe(200)
}
