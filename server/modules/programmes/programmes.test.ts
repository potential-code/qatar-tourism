import '../../__tests__/helpers/env'

import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  mock,
  setDefaultTimeout,
  test,
} from 'bun:test'
import { db } from '@server/db/connection'
import { auditEvents, enrolments, programmes, user } from '@server/db/schema'
import { now } from '@server/lib/clock'
import { and, eq } from 'drizzle-orm'
import { ensureSeeded } from '../../__tests__/helpers/seeded'
import { stubSession } from '../../__tests__/helpers/session'
import {
  call,
  cleanupTestAccounts,
  sessionCookieFor,
  TEST_EMAIL_PREFIX,
  userIdByEmail,
} from '../profiles/profiles.test-utils'

setDefaultTimeout(120_000)

beforeAll(async () => {
  await ensureSeeded()
})

afterAll(async () => {
  await cleanupTestAccounts()
})

afterEach(() => {
  mock.restore()
})

describe('public catalogue (brief §2–3)', () => {
  test('lists A, B and C to a signed-out visitor with the brief copy', async () => {
    const res = await call('/api/programmes/public')
    expect(res.status).toBe(200)
    const { items } = await res.json()
    expect(items.map((p: { code: string }) => p.code)).toEqual(['A', 'B', 'C'])
    const [a, b, c] = items
    expect(a.cta).toBe('Join Program A')
    expect(a.certificationEnabled).toBe(true)
    expect(b.certificationEnabled).toBe(false)
    expect(b.cta).toBe('Start with Program B')
    expect(c.isIllustrative).toBe(true)
    expect(c.cta).toBe('Explore sample programme')
  })

  test('a programme overview has its units, trainers and completion rules', async () => {
    const res = await call('/api/programmes/public/a')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.code).toBe('A')
    expect(body.units.map((u: { courseCode: string | null }) => u.courseCode)).toEqual(
      expect.arrayContaining(['C01', 'C04', 'C06']),
    )
    expect(body.trainers.length).toBeGreaterThan(0)
    expect(body.completionRules).toMatchObject({ session: 70, finalAssessment: 80 })

    const b = await (await call('/api/programmes/public/B')).json()
    expect(b.paths.map((p: { code: string }) => p.code).sort()).toEqual([
      'B-GENERAL',
      'B-HOTEL',
      'B-TRANSPORT',
    ])
    expect((await call('/api/programmes/public/d')).status).toBe(400)
  })

  test('upcoming sessions are future, published, counted from RSVPs and carry no learner data', async () => {
    const res = await call('/api/programmes/public/sessions')
    const { items } = await res.json()
    expect(items).toHaveLength(20)
    for (const session of items) {
      expect(new Date(session.startsAt).getTime()).toBeGreaterThan(now().getTime() - 60_000)
      expect(['published', 'full']).toContain(session.status)
      expect(session.seatsRemaining).toBe(Math.max(0, session.capacity - session.booked))
      expect(session).not.toHaveProperty('email')
    }
    expect(items[0].code).toBe('SES-T01-2')
    expect(items.some((s: { seatsRemaining: number }) => s.seatsRemaining === 0)).toBe(true)

    const onlyB = await (await call('/api/programmes/public/sessions?programme=B')).json()
    expect(onlyB.items.every((s: { programmeCode: string }) => s.programmeCode === 'B')).toBe(true)
  })

  test('trainer profiles are public without contact details', async () => {
    const { items } = await (await call('/api/programmes/public/trainers')).json()
    expect(items).toHaveLength(10)
    expect(items[0]).not.toHaveProperty('email')
    const t03 = await (await call('/api/programmes/public/trainers/T03')).json()
    expect(t03.fullName).toBe('Leila Haddad')
    expect(t03.upcomingSessions.length).toBeGreaterThan(0)
    expect((await call('/api/programmes/public/trainers/T99')).status).toBe(404)
    expect((await call('/api/programmes/public/trainers/x')).status).toBe(400)
  })
})

describe('joining a programme (brief §3 routing)', () => {
  test('needs a session, and only a learner may enrol', async () => {
    expect((await call('/api/programmes/a/enrol', { method: 'POST' })).status).toBe(401)
    stubSession('trainer')
    expect((await call('/api/programmes/a/enrol', { method: 'POST' })).status).toBe(403)
    stubSession('admin')
    expect((await call('/api/programmes/a/enrol', { method: 'POST' })).status).toBe(403)
  })

  test('Join Program A keeps the B enrolment and is idempotent; C refuses', async () => {
    const email = `${TEST_EMAIL_PREFIX}join-a@example.com`
    const registered = await call('/api/profiles/register', {
      body: { name: 'Rashid Al Marri', email, password: 'AgentATest2026!' },
      ip: '10.0.2.1',
    })
    expect(registered.status).toBe(201)
    const id = (await userIdByEmail(email)) as string
    await db.update(user).set({ emailVerified: true }).where(eq(user.id, id))
    const { cookie } = await sessionCookieFor(id)

    const [bBefore] = await db.select().from(enrolments).where(eq(enrolments.learnerId, id))

    const first = await call('/api/programmes/a/enrol', { method: 'POST', cookie })
    expect(first.status).toBe(200)
    expect(await first.json()).toMatchObject({ programme: 'A', created: true })
    const again = await call('/api/programmes/A/enrol', { method: 'POST', cookie })
    expect((await again.json()).created).toBe(false)

    const rows = await db
      .select({ code: programmes.code, id: enrolments.id, updatedAt: enrolments.updatedAt })
      .from(enrolments)
      .innerJoin(programmes, eq(programmes.id, enrolments.programmeId))
      .where(eq(enrolments.learnerId, id))
    expect(rows.map((r) => r.code).sort()).toEqual(['A', 'B'])
    expect(rows.find((r) => r.code === 'B')?.id).toBe(bBefore?.id)

    const audit = await db
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.action, 'enrolment.create'), eq(auditEvents.actorId, id)))
    expect(audit).toHaveLength(2)

    const c = await call('/api/programmes/c/enrol', { method: 'POST', cookie })
    expect(c.status).toBe(409)

    const mine = await (await call('/api/programmes/me/enrolments', { cookie })).json()
    expect(mine.items.map((e: { programme: string }) => e.programme)).toEqual(['A', 'B'])
  })
})
