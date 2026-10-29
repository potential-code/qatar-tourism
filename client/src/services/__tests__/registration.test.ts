import { beforeEach, describe, expect, test } from 'bun:test'
import type { DemoDb } from '@/mocks/db'
import { signIn } from '../auth.service'
import { requestPasswordReset, resetPassword } from '../password-reset.service'
import { register, resendSimulated, verifySimulated } from '../registration.service'
import { signInSimulated } from '../sso.service'
import { actAs, freshDemo } from './helpers'

let db: DemoDb

beforeEach(() => {
  db = freshDemo()
})

const PASSWORD = 'Visitor2026!'
const EMAIL = 'hessa.visitor@example.com'

const pathOf = (userId: string) => {
  const enrolment = db.enrolments.find((e) => e.learnerId === userId)
  const path = db.learningPaths.find((p) => p.id === enrolment?.pathId)
  return { code: path?.code, reason: enrolment?.assignmentReason }
}

describe('registration with simulated verification (brief §3)', () => {
  test('only fictional example.com addresses may register', async () => {
    const before = db.users.length
    const failure = await register({
      name: 'Hessa Al Kuwari',
      email: 'hessa@gmail.com',
      password: PASSWORD,
    }).catch((e) => e)
    expect(failure).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' })
    expect(JSON.stringify(failure.details)).toContain('example.com')
    expect(db.users).toHaveLength(before)
  })

  test('creates a learner with a draft profile, default B enrolment and a simulated email', async () => {
    const result = await register({
      name: 'Hessa Al Kuwari',
      email: EMAIL,
      password: PASSWORD,
      role: 'admin',
    } as never)
    expect(result.learnerCode).toBe('L1201')
    expect(result.simulatedEmail.label).toContain('Simulated email')
    expect(result.simulatedEmail.code).toMatch(/^\d{6}$/)

    const account = db.users.find((u) => u.email === EMAIL)
    // A smuggled `role` is ignored: public registration always creates a learner.
    expect(account).toMatchObject({ role: 'learner', emailVerified: false })
    const id = account?.id ?? ''
    expect(db.profiles.find((p) => p.userId === id)?.status).toBe('draft')
    expect(pathOf(id).code).toBe('B-GENERAL')
    expect(pathOf(id).reason).toContain('profile incomplete')
    const logged = db.notifications.filter((n) => n.recipientId === id)
    expect(logged.map((n) => [n.channel, n.state]).sort()).toEqual([
      ['email', 'simulated'],
      ['in_app', 'sent'],
    ])
  })

  test('consecutive registrations get distinct learner codes', async () => {
    const codes = await Promise.all(
      [1, 2, 3].map(
        async (n) =>
          (
            await register({
              name: `Parallel Visitor ${n}`,
              email: `parallel-${n}@example.com`,
              password: PASSWORD,
            })
          ).learnerCode,
      ),
    )
    expect(new Set(codes).size).toBe(3)
  })

  test('a visitor from the Program A call to action is not placed on B', async () => {
    await register({ name: 'Rashid Al Marri', email: EMAIL, password: PASSWORD, programme: 'A' })
    const id = db.users.find((u) => u.email === EMAIL)?.id
    expect(db.enrolments.filter((e) => e.learnerId === id)).toHaveLength(0)
  })

  test('an unverified repeat registration and a verified duplicate get useful errors', async () => {
    await register({ name: 'Hessa Al Kuwari', email: EMAIL, password: PASSWORD })
    await expect(
      register({ name: 'Hessa Al Kuwari', email: EMAIL, password: PASSWORD }),
    ).rejects.toMatchObject({ status: 409, code: 'ACCOUNT_UNVERIFIED' })
    await expect(
      register({ name: 'Maha', email: 'learner0001@example.com', password: PASSWORD }),
    ).rejects.toMatchObject({ status: 409, code: 'ACCOUNT_EXISTS' })
  })

  test('verification rejects a wrong code, accepts the issued one, then sign-in works', async () => {
    await register({ name: 'Hessa Al Kuwari', email: EMAIL, password: PASSWORD })
    await expect(signIn(EMAIL, PASSWORD)).rejects.toMatchObject({ code: 'EMAIL_NOT_VERIFIED' })
    await expect(verifySimulated({ email: EMAIL, code: '000000' })).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_CODE',
    })
    const { simulatedEmail } = await resendSimulated(EMAIL)
    expect(simulatedEmail?.code).toMatch(/^\d{6}$/)
    expect(await verifySimulated({ email: EMAIL, code: simulatedEmail?.code ?? '' })).toEqual({
      email: EMAIL,
      verified: true,
    })
    const account = db.users.find((u) => u.email === EMAIL)
    expect(account?.emailVerified).toBe(true)
    const actions = db.auditEvents.filter((a) => a.actorId === account?.id).map((a) => a.action)
    expect(actions).toEqual(
      expect.arrayContaining(['account.register', 'account.verify_simulated', 'enrolment.create']),
    )
    // The chosen password, not the demo password, signs in.
    await expect(signIn(EMAIL, 'password')).rejects.toMatchObject({ status: 401 })
    expect((await signIn(EMAIL, PASSWORD)).user.role).toBe('learner')
    // A verified address never gets a fresh code.
    expect((await resendSimulated(EMAIL)).simulatedEmail).toBeNull()
  })
})

describe('simulated SSO and password reset', () => {
  test('SSO signs in to the fixed mock learner and records it as simulated', async () => {
    const result = await signInSimulated('qatar-tourism')
    expect(result).toMatchObject({ role: 'learner', provider: 'qatar-tourism' })
    const account = db.users.find((u) => u.email === 'learner0013@example.com')
    expect(db.session?.userId).toBe(account?.id ?? '')
    const event = db.auditEvents.find((a) => a.action === 'auth.sso_simulated')
    expect(event?.after).toMatchObject({ mode: 'simulated', claimsVerified: false })
    await expect(signInSimulated('google' as never)).rejects.toMatchObject({ status: 400 })
  })

  test('SSO refuses a suspended mock account', async () => {
    const account = db.users.find((u) => u.email === 'learner0016@example.com')
    const profile = db.profiles.find((p) => p.userId === account?.id)
    if (!profile) throw new Error('missing profile')
    profile.suspended = true
    await expect(signInSimulated('organisation')).rejects.toMatchObject({
      code: 'ACCOUNT_SUSPENDED',
    })
  })

  test('a reset link sets a new password once; unknown addresses get no link', async () => {
    expect((await requestPasswordReset('nobody@example.com')).simulatedEmail).toBeNull()
    const { simulatedEmail } = await requestPasswordReset('learner0001@example.com')
    const token = simulatedEmail?.token ?? ''
    await resetPassword({ token, newPassword: 'NewSecret2026' })
    await expect(signIn('learner0001@example.com', 'password')).rejects.toMatchObject({
      status: 401,
    })
    expect((await signIn('learner0001@example.com', 'NewSecret2026')).user.id).toBe('user-l0001')
    await expect(resetPassword({ token, newPassword: 'Another2026' })).rejects.toMatchObject({
      code: 'INVALID_TOKEN',
    })
    actAs(db, null)
  })
})
