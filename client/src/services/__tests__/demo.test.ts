import { beforeEach, describe, expect, test } from 'bun:test'
import type { DemoDb } from '@/mocks/db'
import { getDemoMeta, resetDemoData } from '../demo.service'
import { actAs, freshDemo } from './helpers'

let db: DemoDb

beforeEach(() => {
  db = freshDemo()
})

/** Every collection, without the bits a reset is expected to change. */
function snapshot(d: DemoDb) {
  const { session: _session, meta, auditEvents, ...rest } = d
  return JSON.stringify({
    ...rest,
    meta: { ...meta, seededAt: '' },
    auditEvents: auditEvents.filter((e) => e.action !== 'demo.reset'),
  })
}

describe('demo reset', () => {
  test('is 401 signed out and 403 for a learner or a trainer', async () => {
    actAs(db, null)
    await expect(resetDemoData()).rejects.toMatchObject({ status: 401 })
    actAs(db, 'user-l0001')
    await expect(resetDemoData()).rejects.toMatchObject({ status: 403 })
    actAs(db, 'user-t01')
    await expect(resetDemoData()).rejects.toMatchObject({ status: 403 })
  })

  test('restores the snapshot, keeps the admin signed in and audits the reset', async () => {
    const pristine = snapshot(db)
    const learner = db.users.find((u) => u.id === 'user-l0001')
    if (learner) learner.name = 'Tampered'
    db.enrolments.pop()
    actAs(db, 'user-admin')

    const result = await resetDemoData()
    expect(result.meta.counts.enrolments).toBe(1260)
    expect(db.session).toEqual({ userId: 'user-admin', facilitatorId: null })
    expect(db.users.find((u) => u.id === 'user-l0001')?.name).toBe('Maha Al Nouri')
    expect(snapshot(db)).toBe(pristine)
    const audit = db.auditEvents.filter((e) => e.action === 'demo.reset')
    expect(audit).toHaveLength(1)
    expect(audit[0]?.actorId).toBe('user-admin')
  })

  test('two resets produce identical data', async () => {
    actAs(db, 'user-admin')
    await resetDemoData()
    const first = snapshot(db)
    await resetDemoData()
    expect(snapshot(db)).toBe(first)
  })

  test('meta is readable by any signed-in user', async () => {
    actAs(db, 'user-l0001')
    const meta = await getDemoMeta()
    expect(meta.referenceDate).toBe('2026-10-27')
    expect(meta.counts.certificates).toBe(120)
    expect(Date.parse(meta.now)).toBeGreaterThanOrEqual(Date.parse('2026-10-27T05:00:00.000Z'))
  })
})
