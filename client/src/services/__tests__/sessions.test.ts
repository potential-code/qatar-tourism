import { beforeEach, describe, expect, test } from 'bun:test'
import { rescheduleModalCopy } from '@shared/content/notifications'
import type { DemoDb } from '@/mocks/db'
import { getRoster, markAttendance } from '../attendance.service'
import {
  cancelSession,
  createSession,
  getImpact,
  getSessionDetail,
  listSessions,
  publishSession,
  rescheduleSession,
  updateSession,
} from '../sessions.service'
import { actAs, freshDemo } from './helpers'
import { ADMIN, OMAR, rejection, sessionId, T01, T03, T05 } from './sessions-support'

let db: DemoDb

beforeEach(() => {
  db = freshDemo()
})

const trainerIdOf = (code: string) => db.sessions.find((s) => s.code === code)?.trainerId as string
const programmeIdOf = (code: string) =>
  db.sessions.find((s) => s.code === code)?.programmeId as string

const draft = (overrides: Record<string, unknown>) =>
  ({
    title: 'Visitor welcome refresher',
    format: 'in_person',
    capacity: 12,
    venue: 'Demo Academy',
    room: 'Room 4',
    accessNote: 'Step-free entrance from the main lobby.',
    cancellationPolicy: 'Self-service changes until 24 hours before the session.',
    description: 'A short refresher on the greet, ask, listen and next-step pattern.',
    materials: [],
    ...overrides,
  }) as never

describe('trainer scope (brief §10–11)', () => {
  test('My sessions lists only the trainer’s own sessions', async () => {
    actAs(db, T01)
    const res = await listSessions()
    expect(res.items).toHaveLength(3)
    expect(res.items.every((s) => s.trainer.id === trainerIdOf('SES-T01-1'))).toBe(true)
  })

  test("Trainer 1 gets 403 for Trainer 2's session, roster and edits, whatever id is sent", async () => {
    actAs(db, T01)
    const other = sessionId('SES-T02-2')
    expect((await rejection(getSessionDetail(other))).status).toBe(403)
    expect((await rejection(getRoster(other))).status).toBe(403)
    expect((await rejection(getImpact(other))).status).toBe(403)
    const cancel = await rejection(
      cancelSession(other, { reason: 'Not mine at all', idempotencyKey: 'tamper-001' }),
    )
    expect(cancel.status).toBe(403)
    expect(db.sessions.find((s) => s.id === other)?.status).not.toBe('cancelled')
  })

  test('programme reassignment is admin only', async () => {
    actAs(db, T01)
    const { session: s } = await getSessionDetail(sessionId('SES-T01-3'))
    const res = await rejection(
      updateSession(
        s.id,
        draft({
          title: s.title,
          programmeId: programmeIdOf('SES-T06-2'),
          trainerId: s.trainer.id,
          startsAt: s.startsAt,
          endsAt: s.endsAt,
        }),
      ),
    )
    expect(res.status).toBe(403)
    expect(res.message).toContain('admin')
  })

  test('a learner cannot reach the trainer workspace', async () => {
    actAs(db, OMAR)
    expect((await rejection(listSessions())).status).toBe(403)
  })

  test('admins may manage any trainer’s session', async () => {
    actAs(db, ADMIN)
    const res = await getSessionDetail(sessionId('SES-T02-2'))
    expect(res.session.code).toBe('SES-T02-2')
  })
})

describe('create and publish', () => {
  test('missing fields, conflicts and a valid create', async () => {
    actAs(db, T01)
    const trainerId = trainerIdOf('SES-T01-2')
    const programmeId = programmeIdOf('SES-T01-2')
    const { session } = await getSessionDetail(sessionId('SES-T01-2'))
    const { startsAt, endsAt } = session

    const missing = await rejection(
      createSession({ session: draft({ trainerId, programmeId, startsAt, endsAt, venue: null }) }),
    )
    expect(missing.status).toBe(400)

    const clash = await rejection(
      createSession({ session: draft({ trainerId, programmeId, startsAt, endsAt }) }),
    )
    expect(clash.status).toBe(409)
    expect(clash.code).toBe('SCHEDULE_CONFLICT')

    const start = new Date(new Date(startsAt).getTime() + 5 * 3_600_000)
    const created = await createSession({
      session: draft({
        trainerId,
        programmeId,
        startsAt: start.toISOString(),
        endsAt: new Date(start.getTime() + 3_600_000).toISOString(),
      }),
    })
    expect(created.status).toBe('draft')
    expect(created.code).toBe('SES-T01-4')

    const published = await publishSession(created.id)
    expect(published.status).toBe('published')
  })

  test('a trainer cannot create a session for another trainer', async () => {
    actAs(db, T01)
    const start = new Date('2026-11-20T06:00:00.000Z')
    const res = await rejection(
      createSession({
        session: draft({
          trainerId: trainerIdOf('SES-T02-2'),
          programmeId: programmeIdOf('SES-T02-2'),
          startsAt: start.toISOString(),
          endsAt: new Date(start.getTime() + 3_600_000).toISOString(),
        }),
      }),
    )
    expect(res.status).toBe(403)
  })
})

describe('reschedule (brief §10–11)', () => {
  test('shows the affected count, notifies each active RSVP once and never duplicates', async () => {
    const id = sessionId('SES-T05-3')
    actAs(db, T05)
    expect((await getImpact(id)).confirmed).toBe(18)

    const { session } = await getSessionDetail(id)
    const oldStart = new Date(session.startsAt)
    const newStart = new Date(oldStart.getTime() + 24 * 3_600_000)
    const body = {
      startsAt: newStart.toISOString(),
      endsAt: new Date(newStart.getTime() + 3_600_000).toISOString(),
      reason: 'The trainer is presenting at an Academy briefing.',
      venue: 'Demo Academy, Room 2',
      idempotencyKey: 'test-reschedule-0001',
    }
    const first = await rescheduleSession(id, body)
    expect(first.affected).toBe(18)
    expect(first.replayed).toBe(false)
    expect(first.venueChanged).toBe(true)
    expect(rescheduleModalCopy(first.affected)).toContain('18 registered learners')

    const sent = db.notifications.filter((n) => n.eventId === first.eventId)
    expect(sent).toHaveLength(36) // one in-app and one simulated email per learner
    expect(sent.filter((n) => n.channel === 'email').every((n) => n.state === 'simulated')).toBe(
      true,
    )
    expect(sent[0]?.subject).toContain('Your session has been rescheduled')
    expect(sent[0]?.body).toContain('Qatar time')

    // Retrying the same action (same idempotency key) sends nothing new.
    const retry = await rescheduleSession(id, body)
    expect(retry.replayed).toBe(true)
    expect(retry.affected).toBe(18)
    expect(db.notifications.filter((n) => n.eventId === first.eventId)).toHaveLength(36)

    // RSVPs and the session ID are preserved.
    expect(db.rsvps.filter((r) => r.sessionId === id && r.status === 'confirmed')).toHaveLength(18)
    const history = await getSessionDetail(id)
    expect(history.rescheduleHistory).toHaveLength(2)
    expect(history.session.startsAt).toBe(newStart.toISOString())

    // Brief §11: one audit event with before/after and reason, even after the retry.
    const audited = db.auditEvents.filter(
      (e) => e.objectId === id && e.action === 'session.reschedule' && e.reason === body.reason,
    )
    expect(audited).toHaveLength(1)
    expect(audited[0]?.before).toMatchObject({ startsAt: oldStart.toISOString() })
    expect(audited[0]?.after).toMatchObject({ startsAt: newStart.toISOString(), notified: 18 })
  })

  test('waitlisted learners receive a separate update', async () => {
    actAs(db, T03)
    const target = sessionId('SES-T03-2')
    const { session } = await getSessionDetail(target)
    const start = new Date(new Date(session.startsAt).getTime() + 2 * 3_600_000)
    const res = await rescheduleSession(target, {
      startsAt: start.toISOString(),
      endsAt: new Date(start.getTime() + 3_600_000).toISOString(),
      reason: 'Room change for a facilities check.',
      idempotencyKey: 'test-reschedule-0002',
    })
    expect(res.affected).toBe(20)
    expect(res.waitlistNotified).toBe(3)
    const waitlistMessages = db.notifications.filter((n) => n.eventId === `${res.eventId}:waitlist`)
    expect(waitlistMessages.length).toBe(6)
    expect(waitlistMessages.every((n) => n.kind === 'session_waitlist_update')).toBe(true)
  })
})

describe('cancel (brief §10)', () => {
  test('keeps history, releases reservations, offers alternatives and never completes', async () => {
    const id = sessionId('SES-T01-3')
    actAs(db, T01)
    const booked = db.rsvps.filter(
      (r) => r.sessionId === id && (r.status === 'confirmed' || r.status === 'waitlisted'),
    )
    const bookedIds = booked.map((r) => r.id)
    const body = { reason: 'The trainer is unwell.', idempotencyKey: 'test-cancel-0001' }
    const res = await cancelSession(id, body)
    expect(res.affected).toBe(booked.length)
    expect(Array.isArray(res.alternatives)).toBe(true)

    expect(db.sessions.find((s) => s.id === id)?.status).toBe('cancelled')
    const released = db.rsvps.filter((r) => r.sessionId === id)
    expect(released.every((r) => r.status === 'cancelled')).toBe(true)
    expect(released).toHaveLength(booked.length)
    expect(db.attendance.filter((a) => a.sessionId === id)).toEqual([])
    expect(db.sessionScores.filter((s) => s.sessionId === id)).toEqual([])

    const retry = await cancelSession(id, body)
    expect(retry.replayed).toBe(true)
    expect(db.notifications.filter((n) => n.eventId === res.eventId)).toHaveLength(
      booked.length * 2,
    )

    // Nothing can be recorded against a cancelled session.
    const mark = await rejection(
      markAttendance({ rsvpId: bookedIds[0] as string, status: 'attended' }),
    )
    expect(mark.status).toBe(409)

    const audited = db.auditEvents.filter((e) => e.objectId === id && e.action === 'session.cancel')
    expect(audited).toHaveLength(1)
    expect(audited[0]?.reason).toBe(body.reason)
  })
})
