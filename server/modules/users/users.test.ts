import '../../__tests__/helpers/env'

import { afterEach, beforeAll, describe, expect, mock, setDefaultTimeout, test } from 'bun:test'
import { app } from '@server/app'
import { auth } from '@server/auth/auth'
import { db } from '@server/db/connection'
import { auditEvents, notifications, profiles, session, user } from '@server/db/schema'
import { reseed } from '@server/db/seed'
import { and, eq } from 'drizzle-orm'
import { CLIENT_ORIGIN } from '../../__tests__/helpers/env'
import { stubSession } from '../../__tests__/helpers/session'

setDefaultTimeout(120_000)

const send = (method: string, body?: unknown) => ({
  method,
  headers: { 'Content-Type': 'application/json', Origin: CLIENT_ORIGIN },
  body: body === undefined ? undefined : JSON.stringify(body),
})

beforeAll(async () => {
  await reseed({ referenceDate: '2026-10-27' })
})

afterEach(() => {
  mock.restore()
})

describe('GET /api/admin/users', () => {
  test('lists all 1,211 seeded accounts without any password field', async () => {
    stubSession('admin')
    const res = await app.request('/api/admin/users?pageSize=25')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.total).toBe(1211)
    expect(body.items).toHaveLength(25)
    expect(JSON.stringify(body)).not.toContain('password')
  })

  test('filters learners by search and programme', async () => {
    stubSession('admin')
    const res = await app.request('/api/admin/users?search=Maha%20Al%20Nouri&programme=B')
    const body = await res.json()
    expect(body.total).toBe(1)
    expect(body.items[0]).toMatchObject({
      learnerCode: 'L0001',
      status: 'active',
      programmes: ['B'],
    })
  })

  test('detail returns the learner timeline, newest first', async () => {
    stubSession('admin')
    const res = await app.request('/api/admin/users/user-l0005')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.profile.learnerCode).toBe('L0005')
    expect(body.certificates).toHaveLength(0)
    const times = body.timeline.map((t: { at: string }) => t.at)
    expect(times).toEqual([...times].sort().reverse())
    expect(body.timeline.some((t: { kind: string }) => t.kind === 'assessment')).toBe(true)
  })
})

describe('create, invite, enrol', () => {
  let createdId = ''

  test('creates a learner, writes a simulated invitation and audits it', async () => {
    stubSession('admin')
    const res = await app.request(
      '/api/admin/users',
      send('POST', {
        name: 'Hessa Al Marri',
        email: 'hessa.demo@example.com',
        organisationId: null,
        jobTitle: 'Guest relations officer',
        jobFunction: 'guest_services',
        seniority: 'entry_level',
        experience: '1_3',
        invite: true,
        programme: 'B',
      }),
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    createdId = body.userId
    expect(body.learnerCode).toBe('L1201')
    expect(body.invitationsCreated).toBe(2)
    expect(body.enrolment.reason).toContain('Default path')

    const notes = await db
      .select()
      .from(notifications)
      .where(eq(notifications.eventId, `invite:${createdId}`))
    expect(notes.map((n) => [n.channel, n.state]).sort()).toEqual([
      ['email', 'simulated'],
      ['in_app', 'simulated'],
    ])
    const events = await db.select().from(auditEvents).where(eq(auditEvents.objectId, createdId))
    expect(events.map((e) => e.action).sort()).toEqual(['user.create', 'user.invite'])
    const [created] = await db.select().from(user).where(eq(user.id, createdId))
    expect(created?.role).toBe('learner')
  })

  test('re-inviting creates no duplicate messages', async () => {
    stubSession('admin')
    const res = await app.request(`/api/admin/users/${createdId}/invite`, send('POST'))
    expect((await res.json()).created).toBe(0)
  })

  test('rejects a non-fictional email and a duplicate enrolment', async () => {
    stubSession('admin')
    const bad = await app.request(
      '/api/admin/users',
      send('POST', {
        name: 'Real Person',
        email: 'someone@gmail.com',
        organisationId: null,
        jobTitle: null,
        jobFunction: null,
        seniority: null,
        experience: null,
      }),
    )
    expect(bad.status).toBe(400)
    const dup = await app.request(
      `/api/admin/users/${createdId}/enrolments`,
      send('POST', { programme: 'B' }),
    )
    expect(dup.status).toBe(409)
  })
})

describe('suspend and reactivate', () => {
  test('suspension revokes sessions and both changes are audited with a reason', async () => {
    await db.insert(session).values({
      id: 'sess-l0009',
      token: 'tok-l0009',
      userId: 'user-l0009',
      expiresAt: new Date(Date.now() + 3_600_000),
      updatedAt: new Date(),
    })
    stubSession('admin')
    const res = await app.request(
      '/api/admin/users/user-l0009/suspend',
      send('POST', { reason: 'Demo access review' }),
    )
    expect(res.status).toBe(200)
    expect((await res.json()).sessionsRevoked).toBe(1)
    const [p] = await db
      .select({ s: profiles.suspended })
      .from(profiles)
      .where(eq(profiles.userId, 'user-l0009'))
    expect(p?.s).toBe(true)

    const back = await app.request(
      '/api/admin/users/user-l0009/reactivate',
      send('POST', { reason: 'Review complete' }),
    )
    expect(back.status).toBe(200)
    const events = await db
      .select({ action: auditEvents.action, reason: auditEvents.reason })
      .from(auditEvents)
      .where(and(eq(auditEvents.objectId, 'user-l0009')))
    expect(events.map((e) => e.action).sort()).toEqual(['user.reactivate', 'user.suspend'])
    expect(events.every((e) => Boolean(e.reason))).toBe(true)
  })

  test('a reason is required', async () => {
    stubSession('admin')
    const res = await app.request(
      '/api/admin/users/user-l0009/suspend',
      send('POST', { reason: '' }),
    )
    expect(res.status).toBe(400)
  })
})

describe('roles', () => {
  test('granting the trainer role without a trainer profile is refused', async () => {
    stubSession('admin')
    const res = await app.request(
      '/api/admin/users/user-l0010/role',
      send('PATCH', { role: 'trainer', reason: 'Testing escalation' }),
    )
    expect(res.status).toBe(400)
  })

  test('public sign-up can never create a trainer', async () => {
    // The same handler as POST /api/auth/sign-up/email, with a smuggled role in the body.
    const result = await auth.api
      .signUpEmail({
        body: {
          name: 'Eager Visitor',
          email: 'eager.visitor@example.com',
          password: 'DemoAcademy2026!',
          role: 'trainer',
        } as never,
      })
      .catch(() => null)
    const [created] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.email, 'eager.visitor@example.com'))
    // Better Auth either rejects the field or ignores it (role has input: false); never "trainer".
    if (result) expect(created?.role).toBe('learner')
    else expect(created).toBeUndefined()
  })
})

describe('access', () => {
  for (const role of ['learner', 'trainer'] as const) {
    test(`${role} gets 403`, async () => {
      stubSession(role)
      expect((await app.request('/api/admin/users')).status).toBe(403)
      expect((await app.request('/api/admin/users/user-l0001')).status).toBe(403)
      expect(
        (
          await app.request(
            '/api/admin/users/user-l0001/suspend',
            send('POST', { reason: 'Escalation attempt' }),
          )
        ).status,
      ).toBe(403)
    })
  }
})
