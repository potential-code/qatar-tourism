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
import { attendance, auditEvents, sessionScores } from '@server/db/schema'
import { and, eq } from 'drizzle-orm'
import { call, freshSeed, sessionId, signInAs, T01, T10 } from '../sessions/test-support'

setDefaultTimeout(120_000)

beforeAll(freshSeed)
afterAll(freshSeed)
afterEach(() => mock.restore())

const as = (who: readonly [string, 'learner' | 'trainer' | 'admin', string]) =>
  signInAs(who[0], who[1], who[2])

const RUBRIC = { preparation: 16, communication: 24, practical: 24, professionalism: 16 }

type RosterRow = {
  rsvpId: string
  learnerCode: string
  displayName: string
  rsvpStatus: string
  attendance: string
  score: { total: number; status: string } | null
}

async function roster(code: string): Promise<RosterRow[]> {
  const res = await call('GET', `/api/attendance/sessions/${sessionId(code)}/roster`)
  expect(res.status).toBe(200)
  return res.json.items
}

describe('roster (brief §10–11)', () => {
  test('shows learner ID and permitted display name only, never contact fields', async () => {
    as(T10)
    const rows = await roster('SES-T10-1')
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row.learnerCode).toMatch(/^L\d{4}$/)
      expect(Object.keys(row)).not.toContain('email')
      expect(Object.keys(row)).not.toContain('mobile')
    }
  })

  test('assigned learners stay inside the trainer’s scope', async () => {
    as(T01)
    const res = await call('GET', '/api/attendance/learners')
    expect(res.status).toBe(200)
    expect(res.json.total).toBeGreaterThan(0)
  })
})

describe('attendance and scoring', () => {
  test('absence cannot become a pass', async () => {
    as(T10)
    const rows = await roster('SES-T10-1')
    const target = rows.find((r) => r.rsvpStatus === 'confirmed' && r.score?.status === 'draft')
    expect(target).toBeTruthy()

    const absent = await call('POST', '/api/attendance/mark', {
      rsvpId: target?.rsvpId,
      status: 'absent',
    })
    expect(absent.status).toBe(200)
    expect(absent.json.scoreRemoved).toBe(true)

    const score = await call('POST', '/api/attendance/score', {
      rsvpId: target?.rsvpId,
      ...RUBRIC,
      status: 'final',
    })
    expect(score.status).toBe(409)
    expect(score.json.error.code).toBe('ABSENCE_CANNOT_PASS')
    const left = await db
      .select()
      .from(sessionScores)
      .where(eq(sessionScores.rsvpId, target?.rsvpId as string))
    expect(left).toEqual([])
  })

  test('draft then final; corrections need a reason and are audited', async () => {
    as(T10)
    const rows = await roster('SES-T10-1')
    const target = rows.find((r) => r.rsvpStatus === 'confirmed' && r.score?.status === 'draft')
    const rsvpId = target?.rsvpId as string

    const saved = await call('POST', '/api/attendance/score', {
      rsvpId,
      ...RUBRIC,
      status: 'draft',
    })
    expect(saved.json).toMatchObject({ total: 80, status: 'draft', passed: true })

    const final = await call('POST', '/api/attendance/score', {
      rsvpId,
      ...RUBRIC,
      feedback: 'Clear and well prepared.',
      status: 'final',
    })
    expect(final.json.status).toBe('final')

    const noReason = await call('POST', '/api/attendance/score', {
      rsvpId,
      ...RUBRIC,
      practical: 10,
      status: 'final',
    })
    expect(noReason.status).toBe(400)
    expect(noReason.json.error.code).toBe('CORRECTION_REASON_REQUIRED')

    const corrected = await call('POST', '/api/attendance/score', {
      rsvpId,
      ...RUBRIC,
      practical: 10,
      status: 'final',
      correctionReason: 'Practical task was scored against the wrong scenario.',
    })
    expect(corrected.json).toMatchObject({ total: 66, passed: false })
    const audits = await db
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.action, 'marking.correct'), eq(auditEvents.objectId, rsvpId)))
    expect(audits.length).toBe(1)
    expect(audits[0]?.reason).toContain('wrong scenario')

    // Changing attendance on a finalised learner is also a correction.
    const markNoReason = await call('POST', '/api/attendance/mark', { rsvpId, status: 'excused' })
    expect(markNoReason.status).toBe(400)
    const [row] = await db.select().from(attendance).where(eq(attendance.rsvpId, rsvpId))
    expect(row?.status === 'attended' || row?.status === 'late').toBe(true)
  })

  test("a trainer cannot mark another trainer's learners", async () => {
    as(T10)
    const rows = await roster('SES-T10-1')
    as(T01)
    const res = await call('POST', '/api/attendance/mark', {
      rsvpId: rows[0]?.rsvpId,
      status: 'attended',
    })
    expect(res.status).toBe(403)
  })
})
