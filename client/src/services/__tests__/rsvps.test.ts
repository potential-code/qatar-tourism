import { beforeEach, describe, expect, test } from 'bun:test'
import type { DemoDb } from '@/mocks/db'
import {
  bookSession,
  cancelBooking,
  decideChangeRequest,
  getCatalogue,
  getMySessions,
  listChangeRequests,
  moveBooking,
  requestBookingChange,
} from '../rsvps.service'
import { getImpact, rescheduleSession } from '../sessions.service'
import { actAs, freshDemo } from './helpers'
import {
  ADMIN,
  LEILA,
  MAHA,
  OMAR,
  rejection,
  rsvpsOn,
  sessionId,
  setClock,
  T01,
} from './sessions-support'

let db: DemoDb

beforeEach(() => {
  db = freshDemo()
})

const confirmedOn = (code: string) => rsvpsOn(code).filter((r) => r.status === 'confirmed')

describe('learner catalogue and eligibility (brief §6)', () => {
  test('Omar sees bookable A sessions and the full one offers the waitlist', async () => {
    actAs(db, OMAR)
    const res = await getCatalogue()
    expect(res.level1.complete).toBe(true)
    const byCode = new Map(res.items.map((s) => [s.code, s]))
    expect(byCode.get('SES-T01-2')?.eligibility.state).toBe('bookable')
    expect(byCode.get('SES-T03-2')?.eligibility.state).toBe('waitlist')
  })

  test('a locked session explains the missing prerequisite', async () => {
    actAs(db, LEILA)
    const res = await rejection(bookSession({ sessionId: sessionId('SES-T01-2') }))
    expect(res.status).toBe(409)
    expect(res.code).toBe('PREREQUISITE_MISSING')
    expect(res.message).toContain('Complete Level 1 first')
  })

  test('Program B has no required sessions: only optional B sessions, A is refused', async () => {
    actAs(db, MAHA)
    const res = await getCatalogue()
    expect(res.items.every((s) => s.programmeCode === 'B' && !s.isCompletionGate)).toBe(true)
    const refused = await rejection(bookSession({ sessionId: sessionId('SES-T01-2') }))
    expect(refused.code).toBe('NOT_ENROLLED')
  })

  test('trainers cannot book', async () => {
    actAs(db, T01)
    expect((await rejection(getCatalogue())).status).toBe(403)
  })
})

describe('booking, capacity, duplicates and waitlist', () => {
  test('booking confirms a seat and updates capacity; duplicates are refused', async () => {
    actAs(db, OMAR)
    const before = confirmedOn('SES-T01-2').length
    const res = await bookSession({ sessionId: sessionId('SES-T01-2') })
    expect(res.status).toBe('confirmed')
    expect(confirmedOn('SES-T01-2')).toHaveLength(before + 1)

    expect((await rejection(bookSession({ sessionId: sessionId('SES-T01-2') }))).code).toBe(
      'ALREADY_BOOKED',
    )
    // A second required session would be a conflicting active reservation.
    expect((await rejection(bookSession({ sessionId: sessionId('SES-T02-3') }))).code).toBe(
      'ACTIVE_RESERVATION',
    )
    const mine = await getMySessions()
    expect(mine.items.some((i) => i.session.code === 'SES-T01-2')).toBe(true)
  })

  test('a full session needs an explicit waitlist request and never exceeds capacity', async () => {
    const full = db.sessions.find((s) => s.code === 'SES-T03-2')
    expect(confirmedOn('SES-T03-2')).toHaveLength(full?.capacity as number)
    actAs(db, OMAR)
    const booked = await bookSession({ sessionId: sessionId('SES-T01-2') })
    const move = await rejection(
      moveBooking({ rsvpId: booked.rsvpId, toSessionId: sessionId('SES-T03-2') }),
    )
    expect(move.code).toBe('SESSION_FULL')
    // The original seat is kept when the move fails.
    expect(db.rsvps.find((r) => r.id === booked.rsvpId)?.status).toBe('confirmed')
    expect(confirmedOn('SES-T03-2')).toHaveLength(full?.capacity as number)
    expect(full?.status).toBe('full')
  })

  test('cancelling a confirmed seat on a full session promotes the first waitlisted learner', async () => {
    const roster = rsvpsOn('SES-T03-2')
    const confirmed = roster.find((r) => r.status === 'confirmed')
    const first = roster.find((r) => r.status === 'waitlisted' && r.waitlistPosition === 1)
    expect(confirmed && first).toBeTruthy()
    actAs(db, confirmed?.learnerId as string)
    await cancelBooking(confirmed?.id as string)

    const after = rsvpsOn('SES-T03-2')
    expect(after.find((r) => r.id === first?.id)?.status).toBe('confirmed')
    expect(after.filter((r) => r.status === 'confirmed')).toHaveLength(20)
    expect(after.filter((r) => r.status === 'waitlisted').map((r) => r.waitlistPosition)).toEqual([
      1, 2,
    ])
    const told = db.notifications.filter((n) => n.eventId === `evt-waitlist-promoted-${first?.id}`)
    expect(told).toHaveLength(2)
  })
})

describe('learner reschedule', () => {
  test('moving releases the original seat only once the replacement is confirmed', async () => {
    actAs(db, OMAR)
    const original = await bookSession({ sessionId: sessionId('SES-T01-2') })
    const res = await moveBooking({ rsvpId: original.rsvpId, toSessionId: sessionId('SES-T02-3') })
    const old = db.rsvps.find((r) => r.id === original.rsvpId)
    expect(old?.status).toBe('moved')
    expect(old?.replacedByRsvpId).toBe(res.rsvpId)
    expect(db.rsvps.find((r) => r.id === res.rsvpId)?.status).toBe('confirmed')
  })

  test("a learner cannot touch another learner's booking", async () => {
    const someone = confirmedOn('SES-T02-2')[0]
    actAs(db, OMAR)
    expect((await rejection(cancelBooking(someone?.id as string))).status).toBe(404)
  })
})

describe('the 24-hour policy and admin review (brief §6)', () => {
  test('inside 24 hours a change becomes a request; the admin decision releases the seat once', async () => {
    // Day +2 01:00 Qatar: SES-T02-2 (Day +2 14:00) is 13 hours away.
    setClock('2026-10-29', -7)
    const booking = confirmedOn('SES-T02-2')[0]
    const rsvpId = booking?.id as string
    actAs(db, booking?.learnerId as string)
    expect((await rejection(cancelBooking(rsvpId))).code).toBe('ADMIN_REVIEW_REQUIRED')

    const reason = 'Family commitment on the day'
    expect(await requestBookingChange(rsvpId, { kind: 'cancel', reason })).toEqual({
      requested: true,
      alreadyRequested: false,
    })
    expect((await requestBookingChange(rsvpId, { kind: 'cancel', reason })).alreadyRequested).toBe(
      true,
    )
    const logged = db.auditEvents.filter(
      (e) => e.action === 'rsvp.change_requested' && e.objectId === rsvpId,
    )
    expect(logged).toHaveLength(1)
    expect(db.notifications.some((n) => n.eventId === `evt-change-request-${rsvpId}`)).toBe(true)

    // The learner cannot review requests; the admin can.
    expect((await rejection(listChangeRequests())).status).toBe(403)
    actAs(db, ADMIN)
    const item = (await listChangeRequests()).items.find((i) => i.rsvpId === rsvpId)
    expect(item?.kind).toBe('cancel')
    expect(item?.decision).toBeNull()

    const approved = await decideChangeRequest(rsvpId, {
      decision: 'approved',
      note: 'Approved as a one-off',
    })
    expect(approved.released).toBe(true)
    expect(db.rsvps.find((r) => r.id === rsvpId)?.status).toBe('cancelled')
    expect(db.notifications.some((n) => n.eventId === `evt-change-decision-${rsvpId}`)).toBe(true)
    const decision = db.auditEvents.find(
      (e) => e.action === 'rsvp.change_approved' && e.objectId === rsvpId,
    )
    expect(decision?.reason).toBe('Approved as a one-off')
    expect((await rejection(decideChangeRequest(rsvpId, { decision: 'declined' }))).status).toBe(
      409,
    )
  })
})

describe('trainer reschedule reaches the learner (brief §11)', () => {
  test('Omar books, the trainer reschedules, Omar sees the move and one notification', async () => {
    const id = sessionId('SES-T01-2')
    actAs(db, OMAR)
    await bookSession({ sessionId: id })

    actAs(db, T01)
    const impact = await getImpact(id)
    const start = new Date(new Date(db.sessions.find((s) => s.id === id)?.startsAt ?? 0).getTime())
    start.setUTCDate(start.getUTCDate() + 1)
    const body = {
      startsAt: start.toISOString(),
      endsAt: new Date(start.getTime() + 2 * 3_600_000).toISOString(),
      reason: 'The training room is being refurbished.',
      idempotencyKey: 'test-omar-move-0001',
    }
    const res = await rescheduleSession(id, body)
    expect(res.affected).toBe(impact.confirmed)
    await rescheduleSession(id, body)

    actAs(db, OMAR)
    const mine = (await getMySessions()).items.find((i) => i.session.id === id)
    expect(mine?.session.startsAt).toBe(start.toISOString())
    expect(mine?.rescheduled?.reason).toBe(body.reason)
    const told = db.notifications.filter(
      (n) => n.recipientId === OMAR && n.eventId === res.eventId && n.channel === 'in_app',
    )
    expect(told).toHaveLength(1)
  })
})
