import { beforeEach, describe, expect, test } from 'bun:test'
import type { DemoDb } from '@/mocks/db'
import { getAssignedLearners, getRoster, markAttendance, recordScore } from '../attendance.service'
import { bookSession } from '../rsvps.service'
import { actAs, freshDemo } from './helpers'
import { OMAR, rejection, sessionId, T01, T10 } from './sessions-support'

let db: DemoDb

beforeEach(() => {
  db = freshDemo()
})

const RUBRIC = { preparation: 16, communication: 24, practical: 24, professionalism: 16 }

async function draftScored(code: string) {
  const { items } = await getRoster(sessionId(code))
  const target = items.find((r) => r.rsvpStatus === 'confirmed' && r.score?.status === 'draft')
  expect(target).toBeTruthy()
  return target?.rsvpId as string
}

describe('roster (brief §10–11)', () => {
  test('shows learner ID and permitted display name only, never contact fields', async () => {
    actAs(db, T10)
    const { items } = await getRoster(sessionId('SES-T10-1'))
    expect(items.length).toBeGreaterThan(0)
    for (const row of items) {
      expect(row.learnerCode).toMatch(/^L\d{4}$/)
      expect(Object.keys(row)).not.toContain('email')
      expect(Object.keys(row)).not.toContain('mobile')
    }
  })

  test('assigned learners stay inside the trainer’s scope', async () => {
    actAs(db, T01)
    const res = await getAssignedLearners()
    expect(res.total).toBeGreaterThan(0)
    const own = new Set(
      db.sessions
        .filter((s) => s.trainerId === db.sessions.find((x) => x.code === 'SES-T01-1')?.trainerId)
        .map((s) => s.code),
    )
    expect(res.items.every((i) => own.has(i.latestSession.code))).toBe(true)
  })
})

describe('attendance and scoring', () => {
  test('absence cannot become a pass', async () => {
    actAs(db, T10)
    const rsvpId = await draftScored('SES-T10-1')
    const absent = await markAttendance({ rsvpId, status: 'absent' })
    expect(absent.scoreRemoved).toBe(true)
    const score = await rejection(recordScore({ rsvpId, ...RUBRIC, status: 'final' }))
    expect(score.status).toBe(409)
    expect(score.code).toBe('ABSENCE_CANNOT_PASS')
    expect(db.sessionScores.filter((s) => s.rsvpId === rsvpId)).toEqual([])
  })

  test('draft then final; corrections need a reason and are audited', async () => {
    actAs(db, T10)
    const rsvpId = await draftScored('SES-T10-1')
    expect(await recordScore({ rsvpId, ...RUBRIC, status: 'draft' })).toMatchObject({
      total: 80,
      status: 'draft',
      passed: true,
    })
    const final = await recordScore({
      rsvpId,
      ...RUBRIC,
      feedback: 'Clear and well prepared.',
      status: 'final',
    })
    expect(final.status).toBe('final')

    const noReason = await rejection(
      recordScore({ rsvpId, ...RUBRIC, practical: 10, status: 'final' }),
    )
    expect(noReason.status).toBe(400)
    expect(noReason.code).toBe('CORRECTION_REASON_REQUIRED')

    const corrected = await recordScore({
      rsvpId,
      ...RUBRIC,
      practical: 10,
      status: 'final',
      correctionReason: 'Practical task was scored against the wrong scenario.',
    })
    expect(corrected).toMatchObject({ total: 66, passed: false })
    const audits = db.auditEvents.filter(
      (e) => e.action === 'marking.correct' && e.objectId === rsvpId,
    )
    expect(audits).toHaveLength(1)
    expect(audits[0]?.reason).toContain('wrong scenario')

    // Changing attendance on a finalised learner is also a correction.
    expect((await rejection(markAttendance({ rsvpId, status: 'excused' }))).status).toBe(400)
    const row = db.attendance.find((a) => a.rsvpId === rsvpId)
    expect(row?.status === 'attended' || row?.status === 'late').toBe(true)
  })

  test("a trainer cannot mark another trainer's learners", async () => {
    actAs(db, T10)
    const { items } = await getRoster(sessionId('SES-T10-1'))
    actAs(db, T01)
    const res = await rejection(
      markAttendance({ rsvpId: items[0]?.rsvpId as string, status: 'attended' }),
    )
    expect(res.status).toBe(403)
  })

  test('attendance and a final score recompute the learner’s Program A progress', async () => {
    const id = sessionId('SES-T01-2')
    actAs(db, OMAR)
    const { rsvpId } = await bookSession({ sessionId: id })
    const enrolment = () => {
      const a = db.programmes.find((p) => p.code === 'A')
      const row = db.enrolments.find((e) => e.learnerId === OMAR && e.programmeId === a?.id)
      return { progress: row?.progressPercent, stage: row?.currentStage, status: row?.status }
    }
    const before = enrolment()

    actAs(db, T01)
    await markAttendance({ rsvpId, status: 'attended' })
    await recordScore({ rsvpId, ...RUBRIC, feedback: 'Warm and clear.', status: 'final' })
    const roster = await getRoster(id)
    expect(roster.items.find((r) => r.rsvpId === rsvpId)?.score?.passed).toBe(true)
    expect(enrolment()).not.toEqual(before)
  })
})
