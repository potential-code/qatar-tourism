import { beforeEach, describe, expect, test } from 'bun:test'
import type { DemoDb } from '@/mocks/db'
import {
  getFacilitatorStatus,
  getSession,
  signIn,
  signOut,
  switchFacilitator,
} from '../auth.service'
import { actAs, freshDemo } from './helpers'

let db: DemoDb

beforeEach(() => {
  db = freshDemo()
})

describe('sign in and out', () => {
  test('a seeded account signs in with the demo password', async () => {
    const session = await signIn(' Admin@Example.com ', 'password')
    expect(session.user).toMatchObject({ id: 'user-admin', role: 'admin' })
    expect(db.session).toEqual({ userId: 'user-admin', facilitatorId: null })
    expect((await getSession())?.user.email).toBe('admin@example.com')
  })

  test('a wrong password or an unknown email is the same 401', async () => {
    await expect(signIn('admin@example.com', 'wrong')).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_CREDENTIALS',
    })
    await expect(signIn('nobody@example.com', 'password')).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_CREDENTIALS',
    })
    expect(db.session).toBeNull()
  })

  test('a registered account uses its own password, and must be verified', async () => {
    const learner = db.users.find((u) => u.id === 'user-l0042')
    if (!learner) throw new Error('missing learner')
    db.passwords[learner.id] = 'my-own-secret'
    await expect(signIn(learner.email, 'password')).rejects.toMatchObject({ status: 401 })
    learner.emailVerified = false
    await expect(signIn(learner.email, 'my-own-secret')).rejects.toMatchObject({
      status: 403,
      code: 'EMAIL_NOT_VERIFIED',
    })
    learner.emailVerified = true
    expect((await signIn(learner.email, 'my-own-secret')).user.id).toBe(learner.id)
  })

  test('a suspended account cannot sign in', async () => {
    const profile = db.profiles.find((p) => p.userId === 'user-l0001')
    if (!profile) throw new Error('missing profile')
    profile.suspended = true
    await expect(signIn('maha.alnouri@example.com', 'password')).rejects.toMatchObject({
      status: 403,
      code: 'ACCOUNT_SUSPENDED',
    })
    expect(db.session).toBeNull()
  })

  test('sign out clears the session', async () => {
    await signIn('amal.alnouri@example.com', 'password')
    await signOut()
    expect(db.session).toBeNull()
    expect(await getSession()).toBeNull()
  })
})

describe('demo facilitator toolbar', () => {
  test('active for the admin with every seeded target; inactive for others', async () => {
    actAs(db, 'user-admin')
    const status = await getFacilitatorStatus()
    expect(status.active).toBe(true)
    expect(status.targets).toHaveLength(16)
    expect(status.targets.find((t) => t.key === 'persona-1')).toMatchObject({
      name: 'Maha Al Nouri',
      role: 'learner',
      code: 'L0001',
    })
    actAs(db, 'user-l0001')
    expect((await getFacilitatorStatus()).active).toBe(false)
    await expect(switchFacilitator('admin')).rejects.toMatchObject({ status: 403 })
  })

  test('switching keeps the facilitator, stays available, and is audited', async () => {
    actAs(db, 'user-admin')
    expect(await switchFacilitator('persona-2')).toEqual({ role: 'learner', name: 'Omar Al Safi' })
    expect(db.session).toEqual({ userId: 'user-l0002', facilitatorId: 'user-admin' })
    expect((await getFacilitatorStatus()).active).toBe(true)
    await switchFacilitator('trainer-03')
    expect(db.session?.userId).toBe('user-t03')
    const audits = db.auditEvents.filter((e) => e.action === 'demo.role_switch')
    expect(audits).toHaveLength(2)
    expect(audits[0]).toMatchObject({ actorId: 'user-admin', objectId: 'user-l0002' })
  })

  test('signing out ends facilitator access', async () => {
    actAs(db, 'user-admin')
    await switchFacilitator('persona-1')
    await signOut()
    await signIn('maha.alnouri@example.com', 'password')
    expect((await getFacilitatorStatus()).active).toBe(false)
  })
})
