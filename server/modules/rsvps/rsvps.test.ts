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
import { auditEvents, notifications, rsvps } from '@server/db/schema'
import { getClockState, setClockState } from '@server/lib/clock'
import { and, asc, eq } from 'drizzle-orm'
import {
  ADMIN,
  call,
  freshSeed,
  LEILA,
  MAHA,
  OMAR,
  sessionId,
  signInAs,
  T01,
} from '../sessions/test-support'

setDefaultTimeout(120_000)

beforeAll(freshSeed)
afterAll(freshSeed)
afterEach(() => mock.restore())

const as = (who: readonly [string, 'learner' | 'trainer' | 'admin', string]) =>
  signInAs(who[0], who[1], who[2])

async function activeOn(code: string) {
  return db
    .select()
    .from(rsvps)
    .where(eq(rsvps.sessionId, sessionId(code)))
    .orderBy(asc(rsvps.waitlistPosition))
}

describe('learner catalogue and eligibility (brief §6)', () => {
  test('Omar sees bookable A sessions and the full one offers the waitlist', async () => {
    as(OMAR)
    const res = await call('GET', '/api/rsvps/catalogue')
    expect(res.status).toBe(200)
    expect(res.json.level1.complete).toBe(true)
    const byCode = new Map(res.json.items.map((s: { code: string }) => [s.code, s]))
    expect((byCode.get('SES-T01-2') as { eligibility: { state: string } }).eligibility.state).toBe(
      'bookable',
    )
    expect((byCode.get('SES-T03-2') as { eligibility: { state: string } }).eligibility.state).toBe(
      'waitlist',
    )
  })

  test('a locked session explains the missing prerequisite', async () => {
    as(LEILA)
    const res = await call('POST', '/api/rsvps', { sessionId: sessionId('SES-T01-2') })
    expect(res.status).toBe(409)
    expect(res.json.error.code).toBe('PREREQUISITE_MISSING')
    expect(res.json.error.message).toContain('Complete Level 1 first')
  })

  test('Program B has no required sessions: only optional B sessions, A is refused', async () => {
    as(MAHA)
    const res = await call('GET', '/api/rsvps/catalogue')
    expect(res.json.items.every((s: { programmeCode: string }) => s.programmeCode === 'B')).toBe(
      true,
    )
    expect(res.json.items.every((s: { isCompletionGate: boolean }) => !s.isCompletionGate)).toBe(
      true,
    )
    const refused = await call('POST', '/api/rsvps', { sessionId: sessionId('SES-T01-2') })
    expect(refused.json.error.code).toBe('NOT_ENROLLED')
  })

  test('trainers cannot book', async () => {
    as(T01)
    expect((await call('GET', '/api/rsvps/catalogue')).status).toBe(403)
  })
})

describe('booking, capacity, duplicates and waitlist', () => {
  test('booking confirms a seat and updates capacity; duplicates are refused', async () => {
    as(OMAR)
    const before = (await activeOn('SES-T01-2')).filter((r) => r.status === 'confirmed').length
    const res = await call('POST', '/api/rsvps', { sessionId: sessionId('SES-T01-2') })
    expect(res.status).toBe(201)
    expect(res.json.status).toBe('confirmed')
    const after = (await activeOn('SES-T01-2')).filter((r) => r.status === 'confirmed').length
    expect(after).toBe(before + 1)

    const again = await call('POST', '/api/rsvps', { sessionId: sessionId('SES-T01-2') })
    expect(again.json.error.code).toBe('ALREADY_BOOKED')

    // A second required session would be a conflicting active reservation.
    const other = await call('POST', '/api/rsvps', { sessionId: sessionId('SES-T02-3') })
    expect(other.json.error.code).toBe('ACTIVE_RESERVATION')

    const mine = await call('GET', '/api/rsvps/mine')
    expect(
      mine.json.items.some((i: { session: { code: string } }) => i.session.code === 'SES-T01-2'),
    ).toBe(true)
  })

  test('a full session needs an explicit waitlist request', async () => {
    as(OMAR)
    const full = await call('POST', '/api/rsvps/move', {
      rsvpId: (await activeOn('SES-T01-2')).find((r) => r.learnerId === OMAR[0])?.id,
      toSessionId: sessionId('SES-T03-2'),
    })
    expect(full.json.error.code).toBe('SESSION_FULL')
    // The original seat is kept when the move fails.
    const kept = (await activeOn('SES-T01-2')).find((r) => r.learnerId === OMAR[0])
    expect(kept?.status).toBe('confirmed')
  })

  test('cancelling a confirmed seat on a full session promotes the first waitlisted learner', async () => {
    const roster = await activeOn('SES-T03-2')
    const confirmed = roster.find((r) => r.status === 'confirmed')
    const first = roster.find((r) => r.status === 'waitlisted' && r.waitlistPosition === 1)
    expect(confirmed && first).toBeTruthy()
    signInAs(confirmed?.learnerId as string, 'learner')
    const res = await call('POST', `/api/rsvps/${confirmed?.id}/cancel`, {})
    expect(res.status).toBe(200)

    const after = await activeOn('SES-T03-2')
    expect(after.find((r) => r.id === first?.id)?.status).toBe('confirmed')
    expect(after.filter((r) => r.status === 'confirmed').length).toBe(20)
    expect(after.filter((r) => r.status === 'waitlisted').map((r) => r.waitlistPosition)).toEqual([
      1, 2,
    ])
    const told = await db
      .select()
      .from(notifications)
      .where(eq(notifications.eventId, `evt-waitlist-promoted-${first?.id}`))
    expect(told.length).toBe(2)
  })
})

describe('learner reschedule', () => {
  test('moving releases the original seat only once the replacement is confirmed', async () => {
    as(OMAR)
    const original = (await activeOn('SES-T01-2')).find(
      (r) => r.learnerId === OMAR[0] && r.status === 'confirmed',
    )
    const res = await call('POST', '/api/rsvps/move', {
      rsvpId: original?.id,
      toSessionId: sessionId('SES-T02-3'),
    })
    expect(res.status).toBe(200)
    const [old] = await db
      .select()
      .from(rsvps)
      .where(eq(rsvps.id, original?.id as string))
    expect(old?.status).toBe('moved')
    expect(old?.replacedByRsvpId).toBe(res.json.rsvpId)
    const replacement = (await activeOn('SES-T02-3')).find((r) => r.id === res.json.rsvpId)
    expect(replacement?.status).toBe('confirmed')
  })

  test('inside 24 hours a change becomes an admin review request', async () => {
    const saved = getClockState()
    // Move the demo clock to Day +2 01:00 Qatar: SES-T02-2 (Day +2 14:00) is 13 hours away.
    setClockState({
      referenceDate: '2026-10-29',
      anchoredAt: new Date(Date.now() + 7 * 3_600_000),
    })
    try {
      const booking = (await activeOn('SES-T02-2')).find((r) => r.status === 'confirmed')
      signInAs(booking?.learnerId as string, 'learner')
      const late = await call('POST', `/api/rsvps/${booking?.id}/cancel`, {})
      expect(late.status).toBe(409)
      expect(late.json.error.code).toBe('ADMIN_REVIEW_REQUIRED')

      const request = await call('POST', `/api/rsvps/${booking?.id}/request-change`, {
        kind: 'cancel',
        reason: 'Family commitment on the day',
      })
      expect(request.json).toEqual({ requested: true, alreadyRequested: false })
      const again = await call('POST', `/api/rsvps/${booking?.id}/request-change`, {
        kind: 'cancel',
        reason: 'Family commitment on the day',
      })
      expect(again.json.alreadyRequested).toBe(true)
      const logged = await db
        .select()
        .from(auditEvents)
        .where(
          and(
            eq(auditEvents.action, 'rsvp.change_requested'),
            eq(auditEvents.objectId, booking?.id as string),
          ),
        )
      expect(logged.length).toBe(1)
    } finally {
      setClockState(saved)
    }
  })

  test('the admin sees the late request and approving it releases the seat, once', async () => {
    const booking = (await activeOn('SES-T02-2')).find(
      (r) => r.cancelledReason === null && r.status === 'confirmed',
    )
    const [request] = await db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.action, 'rsvp.change_requested'))
    const rsvpId = request?.objectId as string

    signInAs(booking?.learnerId as string, 'learner')
    expect((await call('GET', '/api/admin/sessions/change-requests')).status).toBe(403)

    as(ADMIN)
    const list = await call('GET', '/api/admin/sessions/change-requests')
    expect(list.status).toBe(200)
    const item = list.json.items.find((i: { rsvpId: string }) => i.rsvpId === rsvpId)
    expect(item.kind).toBe('cancel')
    expect(item.decision).toBeNull()

    const approved = await call('POST', `/api/admin/sessions/change-requests/${rsvpId}`, {
      decision: 'approved',
      note: 'Approved as a one-off',
    })
    expect(approved.status).toBe(200)
    expect(approved.json.released).toBe(true)
    const [row] = await db.select().from(rsvps).where(eq(rsvps.id, rsvpId))
    expect(row?.status).toBe('cancelled')
    const told = await db
      .select()
      .from(notifications)
      .where(eq(notifications.eventId, `evt-change-decision-${rsvpId}`))
    expect(told.length).toBeGreaterThan(0)
    const [decision] = await db
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.action, 'rsvp.change_approved'), eq(auditEvents.objectId, rsvpId)))
    expect(decision?.reason).toBe('Approved as a one-off')

    const again = await call('POST', `/api/admin/sessions/change-requests/${rsvpId}`, {
      decision: 'declined',
    })
    expect(again.status).toBe(409)
  })

  test("a learner cannot touch another learner's booking", async () => {
    const someone = (await activeOn('SES-T02-2')).find((r) => r.status === 'confirmed')
    as(OMAR)
    const res = await call('POST', `/api/rsvps/${someone?.id}/cancel`, {})
    expect(res.status).toBe(404)
  })
})
