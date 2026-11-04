import { beforeEach, describe, expect, test } from 'bun:test'
import type { DemoDb } from '@/mocks/db'
import { signIn } from '../auth.service'
import {
  changeRole,
  createLearner,
  enrolLearner,
  getUser,
  listUsers,
  reactivateUser,
  resendInvite,
  suspendUser,
} from '../users.service'
import { actAs, freshDemo } from './helpers'

let db: DemoDb

beforeEach(() => {
  db = freshDemo()
  actAs(db, 'user-admin')
})

const NEW_LEARNER = {
  name: 'Hessa Al Marri',
  email: 'hessa.demo@example.com',
  organisationId: null,
  jobTitle: 'Guest relations officer',
  jobFunction: 'guest_services' as const,
  seniority: 'entry_level' as const,
  experience: '1_3' as const,
  invite: true,
  programme: 'B' as const,
}

describe('list and detail', () => {
  test('lists all 1,211 seeded accounts without any password field', async () => {
    const page = await listUsers({ pageSize: 25 })
    expect(page.total).toBe(1211)
    expect(page.items).toHaveLength(25)
    expect(page.items[0]?.learnerCode).toBe('L0001')
    expect(JSON.stringify(page)).not.toContain('password')
  })

  test('filters learners by search and programme', async () => {
    const page = await listUsers({ search: 'Maha Al Nouri', programme: 'B' })
    expect(page.total).toBe(1)
    expect(page.items[0]).toMatchObject({
      learnerCode: 'L0001',
      status: 'active',
      programmes: ['B'],
    })
  })

  test('detail returns the learner timeline, newest first', async () => {
    const detail = await getUser('user-l0005')
    expect(detail.profile?.learnerCode).toBe('L0005')
    expect(detail.certificates).toHaveLength(0)
    const times = detail.timeline.map((t) => t.at)
    expect(times).toEqual([...times].sort().reverse())
    expect(detail.timeline.some((t) => t.kind === 'assessment')).toBe(true)
    await expect(getUser('user-nobody')).rejects.toMatchObject({ status: 404 })
  })
})

describe('create, invite, enrol', () => {
  test('creates a learner, writes a simulated invitation and audits it', async () => {
    const result = await createLearner(NEW_LEARNER)
    expect(result.learnerCode).toBe('L1201')
    expect(result.invitationsCreated).toBe(2)
    expect(result.enrolment?.reason).toContain('Default path')

    const notes = db.notifications.filter((n) => n.eventId === `invite:${result.userId}`)
    expect(notes.map((n) => [n.channel, n.state]).sort()).toEqual([
      ['email', 'simulated'],
      ['in_app', 'sent'],
    ])
    const actions = db.auditEvents
      .filter((e) => e.objectId === result.userId)
      .map((e) => e.action)
      .sort()
    expect(actions).toEqual(['user.create', 'user.invite'])
    expect(db.users.find((u) => u.id === result.userId)?.role).toBe('learner')
    const enrolment = db.enrolments.find((e) => e.learnerId === result.userId)
    expect(enrolment?.currentStage).toBeTruthy()
    expect(enrolment?.progressPercent).toBe(0)

    // Re-inviting creates no duplicate messages.
    expect((await resendInvite(result.userId)).created).toBe(0)
    // A duplicate enrolment is refused.
    await expect(enrolLearner(result.userId, 'B')).rejects.toMatchObject({
      status: 409,
      code: 'ALREADY_ENROLLED',
    })
    expect((await enrolLearner(result.userId, 'A')).enrolmentId).toBeTruthy()
  })

  test('rejects a non-fictional email and a duplicate address', async () => {
    const before = db.users.length
    await expect(
      createLearner({ ...NEW_LEARNER, email: 'someone@gmail.com' }),
    ).rejects.toMatchObject({ status: 400 })
    await expect(
      createLearner({ ...NEW_LEARNER, email: 'maha.alnouri@example.com' }),
    ).rejects.toMatchObject({ status: 409, code: 'EMAIL_TAKEN' })
    expect(db.users).toHaveLength(before)
  })
})

describe('suspend and reactivate', () => {
  test('both changes are audited with a reason; a reason is required', async () => {
    await expect(suspendUser('user-l0009', '')).rejects.toMatchObject({ status: 400 })
    expect(await suspendUser('user-l0009', 'Demo access review')).toMatchObject({
      suspended: true,
    })
    expect(db.profiles.find((p) => p.userId === 'user-l0009')?.suspended).toBe(true)
    await expect(suspendUser('user-l0009', 'Demo access review')).rejects.toMatchObject({
      status: 400,
    })
    await reactivateUser('user-l0009', 'Review complete')
    const events = db.auditEvents.filter((e) => e.objectId === 'user-l0009')
    expect(events.map((e) => e.action).sort()).toEqual(['user.reactivate', 'user.suspend'])
    expect(events.every((e) => Boolean(e.reason))).toBe(true)
  })

  test('a suspended learner cannot sign in again until reactivated', async () => {
    await suspendUser('user-l0011', 'Demo access review')
    const email = db.users.find((u) => u.id === 'user-l0011')?.email ?? ''
    await expect(signIn(email, 'password')).rejects.toMatchObject({
      status: 403,
      code: 'ACCOUNT_SUSPENDED',
    })
    actAs(db, 'user-admin')
    await reactivateUser('user-l0011', 'Review complete')
    expect((await signIn(email, 'password')).user.id).toBe('user-l0011')
  })

  test('the admin cannot suspend themselves or another administrator', async () => {
    await expect(suspendUser('user-admin', 'Testing the guard')).rejects.toMatchObject({
      status: 400,
    })
  })
})

describe('roles', () => {
  test('granting the trainer role without a trainer profile is refused', async () => {
    await expect(
      changeRole('user-l0010', { role: 'trainer', reason: 'Testing escalation' }),
    ).rejects.toMatchObject({ status: 400 })
    expect(db.users.find((u) => u.id === 'user-l0010')?.role).toBe('learner')
  })

  test('a role change is audited as a permission change', async () => {
    await changeRole('user-l0010', { role: 'admin', reason: 'Demo escalation check' })
    const event = db.auditEvents.find(
      (e) => e.action === 'permission.change' && e.objectId === 'user-l0010',
    )
    expect(event).toMatchObject({ before: { role: 'learner' }, after: { role: 'admin' } })
    await expect(
      changeRole('user-admin', { role: 'learner', reason: 'Self demotion' }),
    ).rejects.toMatchObject({ status: 400 })
  })
})

describe('access', () => {
  for (const userId of ['user-l0001', 'user-t01']) {
    test(`${userId} gets 403 from every admin user function`, async () => {
      actAs(db, userId)
      await expect(listUsers()).rejects.toMatchObject({ status: 403 })
      await expect(getUser('user-l0001')).rejects.toMatchObject({ status: 403 })
      await expect(suspendUser('user-l0002', 'Not allowed here')).rejects.toMatchObject({
        status: 403,
      })
      await expect(createLearner(NEW_LEARNER)).rejects.toMatchObject({ status: 403 })
      await expect(
        changeRole('user-l0002', { role: 'admin', reason: 'Escalation try' }),
      ).rejects.toMatchObject({ status: 403 })
    })
  }

  test('signed out gets 401', async () => {
    actAs(db, null)
    await expect(listUsers()).rejects.toMatchObject({ status: 401 })
  })
})
