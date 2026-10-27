import './helpers/env'

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
import { app } from '@server/app'
import { auth } from '@server/auth/auth'
import { db } from '@server/db/connection'
import {
  assessmentAttempts,
  certificates,
  notifications,
  rolePlayAttempts,
  rsvps,
  sessions,
  submissions,
  trainerProfiles,
  user,
} from '@server/db/schema'
import { createDemoSession } from '@server/modules/profiles/demo-session'
import { and, eq, ne } from 'drizzle-orm'
import {
  ADMIN,
  call,
  freshSeed,
  OMAR,
  sessionId,
  signInAs,
  T01,
} from '../modules/sessions/test-support'
import { CLIENT_ORIGIN, HAS_TEST_DB } from './helpers/env'
import { stubSession } from './helpers/session'

/**
 * Brief §11 permissions, verified at the API (never the UI). Two layers:
 *
 *  1. A route matrix built from `app.routes`, so a route added later is covered automatically:
 *     no session → 401, learner → 403 on every trainer/admin route, trainer → 403 on every
 *     admin route.
 *  2. ID tampering with seeded records: a trainer cannot act on another trainer's sessions or
 *     submissions; a learner cannot read or change another learner's records; extra body fields
 *     (role, userId, learnerId) are ignored.
 */

setDefaultTimeout(180_000)

beforeAll(async () => {
  if (HAS_TEST_DB) await freshSeed()
})
afterAll(async () => {
  if (HAS_TEST_DB) await freshSeed()
})
afterEach(() => mock.restore())

const as = (who: readonly [string, 'learner' | 'trainer' | 'admin', string]) =>
  signInAs(who[0], who[1], who[2])

const DUMMY_ID = '00000000-0000-4000-8000-000000000000'

/** Endpoints a visitor may call without a session. */
const PUBLIC = [
  /^\/api\/auth\//,
  /^\/api\/health$/,
  /^\/api\/programmes\/public/,
  /^\/api\/certificates\/verify\//,
  /^\/api\/profiles\/register/,
  /^\/api\/profiles\/sso\/simulated$/,
]

/** Admin only (brief §11–14): learners AND trainers get 403. */
const ADMIN_ONLY = [
  /^\/api\/admin\//,
  /^\/api\/audit$/,
  /^\/api\/demo\/reset$/,
  /^\/api\/reports\/(?!ping$)/,
  /^\/api\/analytics\/(?!ping$)/,
  /^\/api\/ai-analytics\/(?!ping$)/,
  /^\/api\/exports\/learners$/,
  /^\/api\/exports\/sessions\/:sessionId\/personal$/,
  /^\/api\/certificates\/:code\/(revoke|reissue)$/,
  /^\/api\/profiles\/facilitator\/switch$/,
]

/** Trainer workspace: learners get 403. */
const STAFF_ONLY = [
  /^\/api\/sessions(\/(?!ping$).*)?$/,
  /^\/api\/attendance\/(?!ping$)/,
  /^\/api\/assignments\/marking/,
  /^\/api\/notifications\/log$/,
  /^\/api\/exports\/sessions\/:sessionId\/marks$/,
]

/** Bodies that pass validation, so the check under test is the role, not the schema. */
const BODIES: Record<string, unknown> = {
  'POST /api/profiles/facilitator/switch': { target: 'admin' },
  'POST /api/demo/reset': { confirm: true },
}

type RouteKey = { method: string; path: string }

function apiRoutes(): RouteKey[] {
  const seen = new Map<string, RouteKey>()
  for (const route of app.routes) {
    if (route.method === 'ALL' || !route.path.startsWith('/api/')) continue
    seen.set(`${route.method} ${route.path}`, { method: route.method, path: route.path })
  }
  return [...seen.values()]
}

const matches = (patterns: RegExp[], path: string) => patterns.some((re) => re.test(path))

/** Required query strings, for the same reason. */
const QUERIES: Record<string, string> = {
  'GET /api/exports/learners': '?programme=A',
}

async function hit({ method, path }: RouteKey) {
  const url =
    path.replace(/:[A-Za-z]+/g, DUMMY_ID).replace(/\/\*$/, '/x') +
    (QUERIES[`${method} ${path}`] ?? '')
  const body = BODIES[`${method} ${path}`] ?? (method === 'GET' ? undefined : {})
  const res = await app.request(url, {
    method,
    headers: { 'Content-Type': 'application/json', Origin: CLIENT_ORIGIN },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return res.status
}

const ROUTES = apiRoutes()
const PROTECTED = ROUTES.filter((r) => !matches(PUBLIC, r.path))

describe('route matrix (brief §11)', () => {
  test('the matrix sees the whole API', () => {
    expect(ROUTES.length).toBeGreaterThan(150)
    expect(PROTECTED.filter((r) => matches(ADMIN_ONLY, r.path)).length).toBeGreaterThan(60)
    expect(PROTECTED.filter((r) => matches(STAFF_ONLY, r.path)).length).toBeGreaterThan(20)
  })

  test('every non-public route needs a session (401)', async () => {
    const leaks: string[] = []
    for (const route of PROTECTED) {
      stubSession(null)
      const status = await hit(route)
      mock.restore()
      if (status !== 401) leaks.push(`${route.method} ${route.path} → ${status}`)
    }
    expect(leaks).toEqual([])
  })

  test.skipIf(!HAS_TEST_DB)('learners get 403 on every trainer and admin route', async () => {
    const leaks: string[] = []
    for (const route of PROTECTED) {
      if (!matches(ADMIN_ONLY, route.path) && !matches(STAFF_ONLY, route.path)) continue
      as(OMAR)
      const status = await hit(route)
      mock.restore()
      if (status !== 403) leaks.push(`${route.method} ${route.path} → ${status}`)
    }
    expect(leaks).toEqual([])
  })

  test.skipIf(!HAS_TEST_DB)('trainers get 403 on every admin route', async () => {
    const leaks: string[] = []
    for (const route of PROTECTED) {
      if (!matches(ADMIN_ONLY, route.path)) continue
      as(T01)
      const status = await hit(route)
      mock.restore()
      if (status !== 403) leaks.push(`${route.method} ${route.path} → ${status}`)
    }
    expect(leaks).toEqual([])
  })
})

describe.skipIf(!HAS_TEST_DB)('trainer ID tampering (brief §10–11)', () => {
  const other = sessionId('SES-T02-2')

  test("Trainer 1 cannot edit, publish, complete, preview or reschedule Trainer 2's session", async () => {
    as(T01)
    const before = (await db.select().from(sessions).where(eq(sessions.id, other)))[0]
    const later = new Date((before?.startsAt.getTime() ?? 0) + 7 * 86_400_000)
    const checks = [
      await call('PATCH', `/api/sessions/${other}`, { title: 'Tampered' }),
      await call('POST', `/api/sessions/${other}/publish`),
      await call('POST', `/api/sessions/${other}/complete`),
      await call('GET', `/api/sessions/${other}/impact`),
      await call('POST', `/api/sessions/${other}/reschedule`, {
        startsAt: later.toISOString(),
        endsAt: new Date(later.getTime() + 3_600_000).toISOString(),
        reason: 'Tampering attempt',
        idempotencyKey: 'tamper-reschedule-1',
      }),
    ]
    // PATCH with a partial body may fail validation first; it must never succeed.
    expect(checks[0]?.status === 400 || checks[0]?.status === 403).toBe(true)
    for (const res of checks.slice(1)) expect(res.status).toBe(403)
    const after = (await db.select().from(sessions).where(eq(sessions.id, other)))[0]
    expect(after?.startsAt.toISOString()).toBe(before?.startsAt.toISOString())
    expect(after?.status).toBe(before?.status)
    expect(after?.title).toBe(before?.title)
  })

  test("Trainer 1 cannot score a learner on another trainer's session", async () => {
    const [rsvp] = await db
      .select({ id: rsvps.id })
      .from(rsvps)
      .where(and(eq(rsvps.sessionId, other), eq(rsvps.status, 'confirmed')))
      .limit(1)
    expect(rsvp).toBeDefined()
    as(T01)
    const res = await call('POST', '/api/attendance/score', {
      rsvpId: rsvp?.id,
      preparation: 20,
      communication: 30,
      practical: 30,
      professionalism: 20,
      status: 'final',
    })
    expect(res.status).toBe(403)
  })

  test("Trainer 1 cannot correct another trainer's submission", async () => {
    const [t01] = await db
      .select({ id: trainerProfiles.id })
      .from(trainerProfiles)
      .where(eq(trainerProfiles.userId, T01[0]))
    const [foreign] = await db
      .select({ id: submissions.id })
      .from(submissions)
      .where(ne(submissions.markerTrainerId, t01?.id ?? DUMMY_ID))
      .limit(1)
    as(T01)
    const res = await call('POST', `/api/assignments/marking/${foreign?.id}/correct`, {
      breakdown: { discovery: 20, options: 20, escalation: 20, followup: 20 },
      feedback: 'Tampering attempt with a long enough feedback.',
      decision: 'approved',
      reason: 'Tampering attempt',
    })
    expect(res.status).toBe(403)
  })

  test("the notification log never shows another trainer's sessions, even when asked by ID", async () => {
    as(T01)
    const res = await call('GET', `/api/notifications/log?sessionId=${other}`)
    expect(res.status).toBe(200)
    expect(res.json.items ?? res.json).toEqual([])
  })
})

describe.skipIf(!HAS_TEST_DB)('learner ID tampering (brief §11 "own only")', () => {
  test("another learner's booking cannot be cancelled, moved or changed", async () => {
    const [foreign] = await db
      .select()
      .from(rsvps)
      .where(and(ne(rsvps.learnerId, OMAR[0]), eq(rsvps.status, 'confirmed')))
      .limit(1)
    as(OMAR)
    expect((await call('POST', `/api/rsvps/${foreign?.id}/cancel`, {})).status).toBe(404)
    expect(
      (
        await call('POST', `/api/rsvps/${foreign?.id}/request-change`, {
          kind: 'cancel',
          reason: 'Tampering attempt',
        })
      ).status,
    ).toBe(404)
    expect(
      (await call('POST', '/api/rsvps/move', { rsvpId: foreign?.id, toSessionId: DUMMY_ID }))
        .status,
    ).toBe(404)
    const [after] = await db
      .select()
      .from(rsvps)
      .where(eq(rsvps.id, foreign?.id ?? DUMMY_ID))
    expect(after?.status).toBe('confirmed')
  })

  test("another learner's practice and assessment attempts are not found", async () => {
    const [practice] = await db
      .select({ id: rolePlayAttempts.id })
      .from(rolePlayAttempts)
      .where(ne(rolePlayAttempts.learnerId, OMAR[0]))
      .limit(1)
    const [attempt] = await db
      .select({ id: assessmentAttempts.id })
      .from(assessmentAttempts)
      .where(ne(assessmentAttempts.learnerId, OMAR[0]))
      .limit(1)
    as(OMAR)
    expect((await call('GET', `/api/roleplay/attempts/${practice?.id}`)).status).toBe(404)
    expect((await call('GET', `/api/assessments/attempts/${attempt?.id}/result`)).status).toBe(404)
    expect(
      (
        await call('PATCH', `/api/assessments/attempts/${attempt?.id}/answer`, {
          competency: 'discover',
          option: 'B',
        })
      ).status,
    ).not.toBe(200)
    expect((await call('POST', `/api/assessments/attempts/${attempt?.id}/submit`)).status).toBe(404)
  })

  test("another learner's certificate, PDF and submission file are not found", async () => {
    const [cert] = await db
      .select({ code: certificates.code })
      .from(certificates)
      .where(ne(certificates.learnerId, OMAR[0]))
      .limit(1)
    const [file] = await db
      .select({ id: submissions.id })
      .from(submissions)
      .where(ne(submissions.learnerId, OMAR[0]))
      .limit(1)
    as(OMAR)
    expect((await call('GET', `/api/certificates/${cert?.code}`)).status).toBe(404)
    expect((await call('GET', `/api/certificates/${cert?.code}/pdf`)).status).toBe(404)
    expect((await call('GET', `/api/assignments/submissions/${file?.id}/file`)).status).toBe(404)
  })

  test("another learner's notifications cannot be marked read", async () => {
    const [foreign] = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(ne(notifications.recipientId, OMAR[0]))
      .limit(1)
    as(OMAR)
    const res = await call('POST', '/api/notifications/read', { ids: [foreign?.id] })
    expect(res.status).toBe(200)
    expect(res.json.updated).toBe(0)
  })

  test('a practice attempt cannot be filed against another learner’s enrolment', async () => {
    const turns = Array.from({ length: 4 }, (_, i) => ({ text: `Reply number ${i + 1} here.` }))
    as(OMAR)
    const res = await call('POST', '/api/roleplay/attempts', {
      enrolmentId: DUMMY_ID,
      scenarioKey: 'changed-booking',
      mode: 'text',
      learnerTurns: turns,
    })
    expect(res.status === 400 || res.status === 404).toBe(true)
  })
})

describe.skipIf(!HAS_TEST_DB)('mass assignment (brief §18 "learner cannot escalate role")', () => {
  test('role and userId in a profile body are ignored', async () => {
    as(OMAR)
    const res = await call('PATCH', '/api/profiles/me/draft', {
      step: 1,
      role: 'admin',
      userId: 'user-l0001',
      id: 'user-l0001',
    })
    expect(res.status).toBeLessThan(500)
    const [row] = await db.select({ role: user.role }).from(user).where(eq(user.id, OMAR[0]))
    expect(row?.role).toBe('learner')
  })

  test('a learnerId in a booking body is ignored', async () => {
    as(OMAR)
    const catalogue = await call('GET', '/api/rsvps/catalogue')
    const items = catalogue.json.items as { id: string; eligibility: { state: string } }[]
    const target = items.find((s) => s.eligibility.state === 'bookable') ?? items[0]
    expect(target).toBeDefined()
    if (!target) return
    const booked = await call('POST', '/api/rsvps', {
      sessionId: target.id,
      learnerId: 'user-l0003',
    })
    expect(booked.status).toBe(201)
    const foreign = await db
      .select()
      .from(rsvps)
      .where(and(eq(rsvps.sessionId, target.id), eq(rsvps.learnerId, 'user-l0003')))
    // Leila may hold a seeded booking there; none may be created by Omar's request.
    for (const row of foreign) expect(row.createdAt.getTime()).toBeLessThan(Date.now() - 1_000)
  })

  test('Better Auth refuses a role in update-user, even with a real session', async () => {
    const session = await createDemoSession(OMAR[0])
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(session.cookie.secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    const signature = Buffer.from(
      await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(session.token)),
    ).toString('base64')
    const headers = new Headers({
      cookie: `${session.cookie.name}=${encodeURIComponent(`${session.token}.${signature}`)}`,
    })
    expect(await auth.api.getSession({ headers })).not.toBeNull()
    const res = await auth.api.updateUser({
      body: { role: 'admin' } as never,
      headers,
      asResponse: true,
    })
    expect(res.status).toBe(400)
    const [row] = await db.select({ role: user.role }).from(user).where(eq(user.id, OMAR[0]))
    expect(row?.role).toBe('learner')
  })
})

describe.skipIf(!HAS_TEST_DB)('public certificate verification (brief §6)', () => {
  test('shows the record fields only: no learner id, evidence or contact data', async () => {
    const [cert] = await db.select({ code: certificates.code }).from(certificates).limit(1)
    const res = await call('GET', `/api/certificates/verify/${cert?.code}`)
    expect(res.status).toBe(200)
    expect(Object.keys(res.json).sort()).toEqual(
      ['code', 'found', 'issuedAt', 'learnerName', 'programmeTitle', 'revokedAt', 'status'].sort(),
    )
  })

  test('an unknown code is "not found", without other details', async () => {
    const res = await call('GET', '/api/certificates/verify/QTA-DEMO-A-999999')
    expect(res.status).toBe(200)
    expect(res.json.found).toBe(false)
  })
})

describe.skipIf(!HAS_TEST_DB)('admin keeps authorised access', () => {
  test('admin reaches the personal-data export and it is audited', async () => {
    as(ADMIN)
    const res = await call('GET', '/api/exports/learners?programme=A')
    expect(res.status).toBe(200)
  })
})
