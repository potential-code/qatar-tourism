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
import {
  auditEvents,
  courses,
  enrolments,
  learningPaths,
  notifications,
  organisations,
  profiles,
  unitProgress,
  user,
} from '@server/db/schema'
import { and, eq } from 'drizzle-orm'
import { ensureSeeded } from '../../__tests__/helpers/seeded'
import { stubSession } from '../../__tests__/helpers/session'
import {
  call,
  cleanupTestAccounts,
  cookiesFrom,
  sessionCookieFor,
  TEST_EMAIL_PREFIX,
  userIdByEmail,
} from './profiles.test-utils'

setDefaultTimeout(120_000)

const IP = '10.0.1.1'
const PASSWORD = 'AgentATest2026!'

beforeAll(async () => {
  await ensureSeeded()
  await cleanupTestAccounts()
})

afterAll(async () => {
  await cleanupTestAccounts()
})

afterEach(() => {
  mock.restore()
})

async function orgId(name: string) {
  const [row] = await db
    .select({ id: organisations.id })
    .from(organisations)
    .where(eq(organisations.name, name))
    .limit(1)
  if (!row) throw new Error(`missing organisation ${name}`)
  return row.id
}

async function enrolmentPath(userId: string) {
  const [row] = await db
    .select({ id: enrolments.id, path: learningPaths.code, reason: enrolments.assignmentReason })
    .from(enrolments)
    .innerJoin(learningPaths, eq(learningPaths.id, enrolments.pathId))
    .where(eq(enrolments.learnerId, userId))
  return row
}

/** Registers a learner through the API, verifies it and returns a signed-in cookie. */
async function registeredLearner(suffix: string, programme: 'A' | 'B' = 'B') {
  const email = `${TEST_EMAIL_PREFIX}${suffix}@example.com`
  const res = await call('/api/profiles/register', {
    body: { name: 'Noor Haddad', email, password: PASSWORD, programme },
    ip: `10.0.1.${suffix.length + 10}`,
  })
  expect(res.status).toBe(201)
  const id = (await userIdByEmail(email)) as string
  await db.update(user).set({ emailVerified: true }).where(eq(user.id, id))
  const { cookie } = await sessionCookieFor(id)
  return { email, id, cookie }
}

function completeBody(organisationId: string) {
  return {
    organisationId,
    organisationType: 'hotel_accommodation',
    jobTitle: 'Guest relations officer',
    jobFunction: 'guest_services',
    seniority: 'experienced_professional',
    experience: '4_7',
    country: 'Qatar',
    city: 'Doha',
    preferredLanguage: 'English',
    goals: ['complaint_handling', 'communication'],
    weeklyMinutes: 60,
    acceptTerms: true,
  }
}

describe('registration with simulated verification (brief §3)', () => {
  const email = `${TEST_EMAIL_PREFIX}register@example.com`

  test('creates a learner with a draft profile, a default B enrolment and a simulated email', async () => {
    const res = await call('/api/profiles/register', {
      body: { name: 'Hessa Al Kuwari', email, password: PASSWORD, role: 'admin' },
      ip: IP,
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.simulatedEmail.label).toContain('Simulated email')
    expect(body.simulatedEmail.code).toMatch(/^\d{6}$/)
    expect(body.learnerCode).toMatch(/^L\d{4}$/)

    const [account] = await db.select().from(user).where(eq(user.email, email))
    // An extra `role` in the body is ignored: public registration always creates a learner.
    expect(account?.role).toBe('learner')
    expect(account?.emailVerified).toBe(false)

    const id = account?.id as string
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, id))
    expect(profile?.status).toBe('draft')
    const enrolment = await enrolmentPath(id)
    expect(enrolment?.path).toBe('B-GENERAL')
    expect(enrolment?.reason).toContain('profile incomplete')

    const logged = await db
      .select({ state: notifications.state, channel: notifications.channel })
      .from(notifications)
      .where(eq(notifications.recipientId, id))
    expect(logged.map((n) => n.state)).toEqual(['simulated', 'simulated'])
  })

  test('a repeat registration gets a useful message, not a second account', async () => {
    const res = await call('/api/profiles/register', {
      body: { name: 'Hessa Al Kuwari', email, password: PASSWORD },
      ip: IP,
    })
    expect(res.status).toBe(409)
    expect((await res.json()).error.code).toBe('ACCOUNT_UNVERIFIED')
  })

  test('verification rejects a wrong code and accepts the issued one once', async () => {
    const wrong = await call('/api/profiles/register/verify', {
      body: { email, code: '000000' },
      ip: IP,
    })
    expect(wrong.status).toBe(400)

    const resend = await call('/api/profiles/register/resend', { body: { email }, ip: IP })
    const { simulatedEmail } = await resend.json()
    expect(simulatedEmail.code).toMatch(/^\d{6}$/)

    const ok = await call('/api/profiles/register/verify', {
      body: { email, code: simulatedEmail.code },
      ip: IP,
    })
    expect(ok.status).toBe(200)
    const [account] = await db.select().from(user).where(eq(user.email, email))
    expect(account?.emailVerified).toBe(true)

    const audit = await db
      .select({ action: auditEvents.action })
      .from(auditEvents)
      .where(eq(auditEvents.actorId, account?.id as string))
    expect(audit.map((a) => a.action)).toEqual(
      expect.arrayContaining(['account.register', 'account.verify_simulated', 'enrolment.create']),
    )

    const duplicate = await call('/api/profiles/register', {
      body: { name: 'Hessa Al Kuwari', email, password: PASSWORD },
      ip: IP,
    })
    expect(duplicate.status).toBe(409)
    const body = await duplicate.json()
    expect(body.error.code).toBe('ACCOUNT_EXISTS')
    expect(body.error.message).toContain('Sign in instead')
  })

  test('a verified address never gets a fresh code', async () => {
    const res = await call('/api/profiles/register/resend', { body: { email }, ip: IP })
    expect((await res.json()).simulatedEmail).toBeNull()
  })
})

describe('profile wizard and edits (brief §4)', () => {
  test('own-profile endpoints need a learner session', async () => {
    expect((await call('/api/profiles/me')).status).toBe(401)
    stubSession('trainer')
    expect((await call('/api/profiles/me')).status).toBe(403)
  })

  test('a draft resumes, completion moves an unstarted B enrolment to the matched path', async () => {
    const learner = await registeredLearner('wizard')
    const pearl = await orgId('Demo Pearl Hospitality')

    const draft = await call('/api/profiles/me/draft', {
      method: 'PATCH',
      cookie: learner.cookie,
      body: {
        step: 2,
        organisationId: pearl,
        organisationType: 'hotel_accommodation',
        jobTitle: 'Guest relations officer',
        jobFunction: 'guest_services',
        seniority: 'experienced_professional',
        experience: '4_7',
      },
    })
    expect(draft.status).toBe(200)
    const saved = await draft.json()
    expect(saved.wizardStep).toBe(2)
    expect(saved.status).toBe('draft')
    expect(saved.organisationName).toBe('Demo Pearl Hospitality')
    expect(saved.completeness).toBeGreaterThan(0)

    const done = await call('/api/profiles/me/complete', {
      cookie: learner.cookie,
      body: completeBody(pearl),
    })
    expect(done.status).toBe(200)
    const body = await done.json()
    expect(body.next).toBe('B')
    expect(body.profile.status).toBe('complete')
    expect(body.profile.completeness).toBe(100)
    expect((await enrolmentPath(learner.id))?.path).toBe('B-HOTEL')
  })

  test('consent is required to complete', async () => {
    const learner = await registeredLearner('consent')
    const res = await call('/api/profiles/me/complete', {
      cookie: learner.cookie,
      body: { ...completeBody(await orgId('Demo Pearl Hospitality')), acceptTerms: false },
    })
    expect(res.status).toBe(400)
  })

  test('"Other" records the typed organisation with its type', async () => {
    const learner = await registeredLearner('other')
    const res = await call('/api/profiles/me/complete', {
      cookie: learner.cookie,
      body: {
        ...completeBody(''),
        organisationId: null,
        organisationOther: 'Agent A Test Shuttles',
        organisationType: 'transport',
        jobFunction: 'transport',
      },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.profile.organisationName).toBe('Agent A Test Shuttles')
    expect(body.profile.organisationType).toBe('transport')
    expect((await enrolmentPath(learner.id))?.path).toBe('B-TRANSPORT')
  })

  test('a role change offers a revised path and keeps completed work', async () => {
    const learner = await registeredLearner('revision')
    const pearl = await orgId('Demo Pearl Hospitality')
    await call('/api/profiles/me/complete', { cookie: learner.cookie, body: completeBody(pearl) })
    const before = await enrolmentPath(learner.id)
    expect(before?.path).toBe('B-HOTEL')

    // The learner has already completed C01 on the hotel path.
    const [c01] = await db.select({ id: courses.id }).from(courses).where(eq(courses.code, 'C01'))
    await db.insert(unitProgress).values({
      enrolmentId: before?.id as string,
      courseId: c01?.id as string,
      status: 'completed',
      percent: 100,
      completedAt: new Date(),
    })
    await db
      .update(enrolments)
      .set({ status: 'in_progress' })
      .where(eq(enrolments.id, before?.id as string))

    const { acceptTerms: _consent, ...update } = completeBody(await orgId('Demo City Mobility'))
    const edited = await call('/api/profiles/me', {
      method: 'PATCH',
      cookie: learner.cookie,
      body: { ...update, organisationType: 'transport', jobFunction: 'transport' },
    })
    expect(edited.status).toBe(200)
    const body = await edited.json()
    expect(body.revisions).toHaveLength(1)
    expect(body.revisions[0].suggestedPath).toBe('B Transport services')
    // Offered only: nothing moved yet.
    expect((await enrolmentPath(learner.id))?.path).toBe('B-HOTEL')

    const accepted = await call('/api/profiles/me/path-revision', {
      cookie: learner.cookie,
      body: { programme: 'B' },
    })
    expect(accepted.status).toBe(200)
    expect((await enrolmentPath(learner.id))?.path).toBe('B-TRANSPORT')
    const kept = await db
      .select({ status: unitProgress.status })
      .from(unitProgress)
      .where(eq(unitProgress.enrolmentId, before?.id as string))
    expect(kept).toEqual([{ status: 'completed' }])

    const [audit] = await db
      .select({ before: auditEvents.before, after: auditEvents.after })
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.action, 'path.reassign'),
          eq(auditEvents.objectId, before?.id as string),
          eq(auditEvents.reason, 'accepted by the learner after a profile update'),
        ),
      )
    expect(audit?.before).toEqual({ path: 'B Hotel guest services' })
  })
})

describe('demo facilitator toolbar (brief §3)', () => {
  test('is inactive for a learner and refuses to switch', async () => {
    const learner = await registeredLearner('nofacilitator')
    const status = await call('/api/profiles/facilitator', { cookie: learner.cookie })
    expect(await status.json()).toEqual({ active: false, targets: [] })
    const res = await call('/api/profiles/facilitator/switch', {
      cookie: learner.cookie,
      body: { target: 'admin' },
    })
    expect(res.status).toBe(403)
  })

  test('the admin switches to a persona and back; the toolbar follows the session', async () => {
    const admin = await sessionCookieFor('user-admin')
    const status = await (await call('/api/profiles/facilitator', { cookie: admin.cookie })).json()
    expect(status.active).toBe(true)
    expect(status.targets).toHaveLength(16)

    const toMaha = await call('/api/profiles/facilitator/switch', {
      cookie: admin.cookie,
      body: { target: 'persona-1' },
    })
    expect(toMaha.status).toBe(200)
    expect(await toMaha.json()).toEqual({ role: 'learner', name: 'Maha Al Nouri' })
    const mahaCookie = cookiesFrom(toMaha, admin.cookie)
    const me = await (await call('/api/me', { cookie: mahaCookie })).json()
    expect(me.user.email).toBe('learner0001@example.com')

    const stillActive = await (
      await call('/api/profiles/facilitator', { cookie: mahaCookie })
    ).json()
    expect(stillActive.active).toBe(true)

    const back = await call('/api/profiles/facilitator/switch', {
      cookie: mahaCookie,
      body: { target: 'admin' },
    })
    expect(back.status).toBe(200)
    const adminAgain = await (
      await call('/api/me', { cookie: cookiesFrom(back, mahaCookie) })
    ).json()
    expect(adminAgain.user.role).toBe('admin')
  })

  test('a facilitator cookie does not carry over to a different session', async () => {
    const admin = await sessionCookieFor('user-admin')
    const toMaha = await call('/api/profiles/facilitator/switch', {
      cookie: admin.cookie,
      body: { target: 'persona-2' },
    })
    const facilitator = cookiesFrom(toMaha)
      .split('; ')
      .find((pair) => pair.startsWith('qta_demo_facilitator='))
    // Someone else signs in on the same browser: their own session plus the old cookie.
    const learner = await registeredLearner('carryover')
    const res = await call('/api/profiles/facilitator/switch', {
      cookie: `${learner.cookie}; ${facilitator}`,
      body: { target: 'admin' },
    })
    expect(res.status).toBe(403)
  })

  test('an unknown target is rejected by validation', async () => {
    const admin = await sessionCookieFor('user-admin')
    const res = await call('/api/profiles/facilitator/switch', {
      cookie: admin.cookie,
      body: { target: 'learner-0100' },
    })
    expect(res.status).toBe(400)
  })
})
