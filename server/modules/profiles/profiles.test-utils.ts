import { app } from '@server/app'
import { auth } from '@server/auth/auth'
import { db } from '@server/db/connection'
import { organisations, profiles, user } from '@server/db/schema'
import { eq, like } from 'drizzle-orm'

/**
 * Test helpers for the account modules (agent A). Kept next to the module, not in the shared
 * __tests__/helpers folder, so parallel agents do not edit the same file.
 */

export const TEST_ORIGIN = 'http://localhost:5173'
export const TEST_EMAIL_PREFIX = 'agent-a-test-'

/** Each test file gets its own client IP so the shared credential rate-limit bucket is untouched. */
export function bunEnv(ip: string) {
  return { server: { requestIP: () => ({ address: ip, family: 'IPv4', port: 40_000 }) } }
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
}

/** A real Better Auth session for a user, as a Cookie header value. No password needed. */
export async function sessionCookieFor(userId: string) {
  const context = await auth.$context
  const session = await context.internalAdapter.createSession(userId)
  const value = encodeURIComponent(`${session.token}.${await sign(session.token, context.secret)}`)
  return { cookie: `${context.authCookies.sessionToken.name}=${value}`, token: session.token }
}

export type RequestOptions = {
  method?: string
  body?: unknown
  cookie?: string
  ip?: string
}

export function call(path: string, options: RequestOptions = {}) {
  const headers: Record<string, string> = { Origin: TEST_ORIGIN }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (options.cookie) headers.Cookie = options.cookie
  return app.request(
    path,
    {
      method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    },
    bunEnv(options.ip ?? '10.0.0.1'),
  )
}

/** Merges Set-Cookie headers from a response into a Cookie header value. */
export function cookiesFrom(response: Response, previous = ''): string {
  const jar = new Map(
    previous
      .split('; ')
      .filter(Boolean)
      .map((pair) => [pair.slice(0, pair.indexOf('=')), pair.slice(pair.indexOf('=') + 1)]),
  )
  for (const header of response.headers.getSetCookie()) {
    const [pair = ''] = header.split(';')
    const name = pair.slice(0, pair.indexOf('='))
    jar.set(name, pair.slice(pair.indexOf('=') + 1))
  }
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join('; ')
}

export async function userIdByEmail(email: string) {
  const [row] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1)
  return row?.id ?? null
}

/** Removes every account and "Other" organisation the account tests created. */
export async function cleanupTestAccounts() {
  const rows = await db
    .select({ id: user.id })
    .from(user)
    .where(like(user.email, `${TEST_EMAIL_PREFIX}%`))
  for (const row of rows) {
    await db.delete(profiles).where(eq(profiles.userId, row.id))
    await db.delete(user).where(eq(user.id, row.id))
  }
  await db.delete(organisations).where(like(organisations.name, 'Agent A Test%'))
}
