import '../../__tests__/helpers/env'

import { afterEach, beforeAll, describe, expect, mock, setDefaultTimeout, test } from 'bun:test'
import { app } from '@server/app'
import { auth } from '@server/auth/auth'
import { db } from '@server/db/connection'
import { auditEvents, session, user } from '@server/db/schema'
import { and, count, eq } from 'drizzle-orm'
import { CLIENT_ORIGIN } from '../../__tests__/helpers/env'
import { ensureSeeded } from '../../__tests__/helpers/seeded'
import { stubSession } from '../../__tests__/helpers/session'

setDefaultTimeout(120_000)

const post = (body: unknown) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: CLIENT_ORIGIN },
  body: JSON.stringify(body),
})

beforeAll(async () => {
  await ensureSeeded()
})

afterEach(() => {
  mock.restore()
})

describe('POST /api/demo/reset', () => {
  test('is 401 without a session', async () => {
    stubSession(null)
    expect((await app.request('/api/demo/reset', post({ confirm: true }))).status).toBe(401)
  })

  test('is 403 for a learner', async () => {
    stubSession('learner')
    const res = await app.request('/api/demo/reset', post({ confirm: true }))
    expect(res.status).toBe(403)
    expect((await res.json()).error.code).toBe('FORBIDDEN')
  })

  test('is 403 for a trainer', async () => {
    stubSession('trainer')
    const res = await app.request('/api/demo/reset', post({ confirm: true }))
    expect(res.status).toBe(403)
  })

  test('needs an explicit confirmation', async () => {
    stubSession('admin')
    expect((await app.request('/api/demo/reset', post({}))).status).toBe(400)
  })

  test('admin: 200, restores the snapshot, keeps their session and writes an audit event', async () => {
    // Dirty the data, and give the admin a live session row.
    await db.update(user).set({ name: 'Tampered' }).where(eq(user.id, 'user-l0001'))
    await db.insert(session).values({
      id: 'session-kept',
      token: 'kept-token',
      userId: 'user-admin',
      expiresAt: new Date(Date.now() + 3_600_000),
      updatedAt: new Date(),
    })
    stubSession('admin')

    const res = await app.request('/api/demo/reset', post({ confirm: true }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.meta.counts.learners).toBe(1200)
    expect(body.meta.referenceDate).toBe('2026-10-27')
    expect(body.message).toContain('fictional')

    const [maha] = await db.select({ name: user.name }).from(user).where(eq(user.id, 'user-l0001'))
    expect(maha?.name).toBe('Maha Al Nouri')

    const [kept] = await db
      .select({ n: count() })
      .from(session)
      .where(eq(session.id, 'session-kept'))
    expect(kept?.n).toBe(1)

    const [event] = await db
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.action, 'demo.reset'), eq(auditEvents.actorId, 'user-admin')))
    expect(event).toMatchObject({ actorRole: 'admin', objectType: 'demo', outcome: 'allowed' })
    expect(event?.reason).toBeTruthy()
  })
})

describe('GET /api/demo/meta', () => {
  test('returns the reference date, seed version and counts to any signed-in role', async () => {
    stubSession('learner')
    const res = await app.request('/api/demo/meta')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.referenceDate).toBe('2026-10-27')
    expect(body.seedVersion).toBe('qta-demo-1.0')
    expect(body.counts).toMatchObject({
      learners: 1200,
      enrolments: 1260,
      sessions: 30,
      certificates: 120,
    })
  })

  test('is 401 without a session', async () => {
    stubSession(null)
    expect((await app.request('/api/demo/meta')).status).toBe(401)
  })
})

describe('seeded accounts can sign in (Better Auth password hash)', () => {
  const password = 'DemoAcademy2026!'
  for (const [role, email] of [
    ['admin', 'admin@example.com'],
    ['trainer', 'trainer04@example.com'],
    ['learner', 'learner0001@example.com'],
  ] as const) {
    test(`${role}: ${email}`, async () => {
      const result = await auth.api.signInEmail({ body: { email, password } })
      expect(result.user.email).toBe(email)
      expect((result.user as { role?: string }).role).toBe(role)
    })
  }

  test('a wrong password is rejected', async () => {
    await expect(
      auth.api.signInEmail({
        body: { email: 'learner0001@example.com', password: 'wrong-password' },
      }),
    ).rejects.toThrow()
  })
})
