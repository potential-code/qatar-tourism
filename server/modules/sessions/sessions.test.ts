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
import { attendance, notifications, rsvps, sessionScores, sessions } from '@server/db/schema'
import { rescheduleModalCopy } from '@shared/content/notifications'
import { and, eq, inArray } from 'drizzle-orm'
import { ADMIN, call, freshSeed, OMAR, sessionId, signInAs, T01, T03, T05 } from './test-support'

setDefaultTimeout(120_000)

beforeAll(freshSeed)
afterAll(freshSeed)
afterEach(() => mock.restore())

const as = (who: readonly [string, 'learner' | 'trainer' | 'admin', string]) =>
  signInAs(who[0], who[1], who[2])

async function trainerIdOf(code: string) {
  const [row] = await db
    .select({ trainerId: sessions.trainerId })
    .from(sessions)
    .where(eq(sessions.code, code))
  return row?.trainerId as string
}

async function programmeIdOf(code: string) {
  const [row] = await db
    .select({ id: sessions.programmeId })
    .from(sessions)
    .where(eq(sessions.code, code))
  return row?.id as string
}

const draft = (overrides: Record<string, unknown>) => ({
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
})

describe('trainer scope (brief §10–11)', () => {
  test('My sessions lists only the trainer’s own sessions', async () => {
    as(T01)
    const res = await call('GET', '/api/sessions')
    expect(res.status).toBe(200)
    const own = await trainerIdOf('SES-T01-1')
    expect(res.json.items.length).toBe(3)
    expect(res.json.items.every((s: { trainer: { id: string } }) => s.trainer.id === own)).toBe(
      true,
    )
  })

  test("Trainer 1 gets 403 for Trainer 2's session, roster and edits", async () => {
    as(T01)
    const other = sessionId('SES-T02-2')
    expect((await call('GET', `/api/sessions/${other}`)).status).toBe(403)
    expect((await call('GET', `/api/attendance/sessions/${other}/roster`)).status).toBe(403)
    expect(
      (
        await call('POST', `/api/sessions/${other}/cancel`, {
          reason: 'Not mine at all',
          idempotencyKey: 'tamper-001',
        })
      ).status,
    ).toBe(403)
  })

  test('programme reassignment is admin only', async () => {
    as(T01)
    const detail = await call('GET', `/api/sessions/${sessionId('SES-T01-3')}`)
    const s = detail.json.session
    const body = {
      ...draft({}),
      title: s.title,
      programmeId: await programmeIdOf('SES-T06-2'),
      trainerId: s.trainer.id,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
    }
    const res = await call('PATCH', `/api/sessions/${s.id}`, body)
    expect(res.status).toBe(403)
    expect(res.json.error.message).toContain('admin')
  })

  test('a learner cannot reach the trainer workspace', async () => {
    as(OMAR)
    expect((await call('GET', '/api/sessions')).status).toBe(403)
  })
})

describe('create and publish', () => {
  test('missing fields, conflicts and a valid create', async () => {
    as(T01)
    const trainerId = await trainerIdOf('SES-T01-2')
    const programmeId = await programmeIdOf('SES-T01-2')
    const existing = await call('GET', `/api/sessions/${sessionId('SES-T01-2')}`)
    const { startsAt, endsAt } = existing.json.session

    const missing = await call('POST', '/api/sessions', {
      session: draft({ trainerId, programmeId, startsAt, endsAt, venue: null }),
    })
    expect(missing.status).toBe(400)

    const clash = await call('POST', '/api/sessions', {
      session: draft({ trainerId, programmeId, startsAt, endsAt }),
    })
    expect(clash.status).toBe(409)
    expect(clash.json.error.code).toBe('SCHEDULE_CONFLICT')

    const start = new Date(new Date(startsAt).getTime() + 5 * 3_600_000)
    const created = await call('POST', '/api/sessions', {
      session: draft({
        trainerId,
        programmeId,
        startsAt: start.toISOString(),
        endsAt: new Date(start.getTime() + 3_600_000).toISOString(),
      }),
    })
    expect(created.status).toBe(201)
    expect(created.json.status).toBe('draft')
    expect(created.json.code).toBe('SES-T01-4')

    const published = await call('POST', `/api/sessions/${created.json.id}/publish`)
    expect(published.json.status).toBe('published')
  })

  test('a trainer cannot create a session for another trainer', async () => {
    as(T01)
    const start = new Date('2026-11-20T06:00:00.000Z')
    const res = await call('POST', '/api/sessions', {
      session: draft({
        trainerId: await trainerIdOf('SES-T02-2'),
        programmeId: await programmeIdOf('SES-T02-2'),
        startsAt: start.toISOString(),
        endsAt: new Date(start.getTime() + 3_600_000).toISOString(),
      }),
    })
    expect(res.status).toBe(403)
  })
})

describe('reschedule (brief §10–11)', () => {
  const id = sessionId('SES-T05-3')

  test('shows the affected count, notifies each active RSVP once and never duplicates', async () => {
    as(T05)
    const impact = await call('GET', `/api/sessions/${id}/impact`)
    expect(impact.json.confirmed).toBe(18)

    const detail = await call('GET', `/api/sessions/${id}`)
    const oldStart = new Date(detail.json.session.startsAt)
    const newStart = new Date(oldStart.getTime() + 24 * 3_600_000)
    const body = {
      startsAt: newStart.toISOString(),
      endsAt: new Date(newStart.getTime() + 3_600_000).toISOString(),
      reason: 'The trainer is presenting at an Academy briefing.',
      venue: 'Demo Academy Room 2',
      idempotencyKey: 'test-reschedule-0001',
    }
    const first = await call('POST', `/api/sessions/${id}/reschedule`, body)
    expect(first.status).toBe(200)
    expect(first.json.affected).toBe(18)
    expect(first.json.replayed).toBe(false)
    expect(first.json.venueChanged).toBe(true)
    expect(rescheduleModalCopy(first.json.affected)).toContain('18 registered learners')

    const eventId = first.json.eventId as string
    const sent = await db.select().from(notifications).where(eq(notifications.eventId, eventId))
    expect(sent.length).toBe(36) // one in-app and one simulated email per learner
    expect(sent.filter((n) => n.channel === 'email').every((n) => n.state === 'simulated')).toBe(
      true,
    )
    expect(sent[0]?.subject).toContain('Your session has been rescheduled')
    expect(sent[0]?.body).toContain('Qatar time')

    const retry = await call('POST', `/api/sessions/${id}/reschedule`, body)
    expect(retry.json.replayed).toBe(true)
    expect(retry.json.affected).toBe(18)
    const after = await db.select().from(notifications).where(eq(notifications.eventId, eventId))
    expect(after.length).toBe(36)

    // RSVPs and the session ID are preserved.
    const kept = await db
      .select()
      .from(rsvps)
      .where(and(eq(rsvps.sessionId, id), eq(rsvps.status, 'confirmed')))
    expect(kept.length).toBe(18)
    const history = await call('GET', `/api/sessions/${id}`)
    expect(history.json.rescheduleHistory.length).toBe(2)
    expect(history.json.session.startsAt).toBe(newStart.toISOString())
  })

  test('waitlisted learners receive a separate update', async () => {
    as(T03)
    const target = sessionId('SES-T03-2')
    const detail = await call('GET', `/api/sessions/${target}`)
    const start = new Date(new Date(detail.json.session.startsAt).getTime() + 2 * 3_600_000)
    const res = await call('POST', `/api/sessions/${target}/reschedule`, {
      startsAt: start.toISOString(),
      endsAt: new Date(start.getTime() + 3_600_000).toISOString(),
      reason: 'Room change for a facilities check.',
      idempotencyKey: 'test-reschedule-0002',
    })
    expect(res.json.affected).toBe(20)
    expect(res.json.waitlistNotified).toBe(3)
    const waitlistMessages = await db
      .select()
      .from(notifications)
      .where(eq(notifications.eventId, `${res.json.eventId}:waitlist`))
    expect(waitlistMessages.every((n) => n.kind === 'session_waitlist_update')).toBe(true)
  })
})

describe('cancel (brief §10)', () => {
  const id = sessionId('SES-T01-3')

  test('keeps history, releases reservations, offers alternatives and never completes', async () => {
    as(T01)
    const booked = await db
      .select({ id: rsvps.id })
      .from(rsvps)
      .where(and(eq(rsvps.sessionId, id), inArray(rsvps.status, ['confirmed', 'waitlisted'])))
    const body = { reason: 'The trainer is unwell.', idempotencyKey: 'test-cancel-0001' }
    const res = await call('POST', `/api/sessions/${id}/cancel`, body)
    expect(res.status).toBe(200)
    expect(res.json.affected).toBe(booked.length)
    expect(Array.isArray(res.json.alternatives)).toBe(true)

    const [row] = await db.select().from(sessions).where(eq(sessions.id, id))
    expect(row?.status).toBe('cancelled')
    const released = await db.select().from(rsvps).where(eq(rsvps.sessionId, id))
    expect(released.every((r) => r.status === 'cancelled')).toBe(true)
    expect(released.length).toBe(booked.length)
    expect(await db.select().from(attendance).where(eq(attendance.sessionId, id))).toEqual([])
    expect(await db.select().from(sessionScores).where(eq(sessionScores.sessionId, id))).toEqual([])

    const retry = await call('POST', `/api/sessions/${id}/cancel`, body)
    expect(retry.json.replayed).toBe(true)
    const sent = await db
      .select()
      .from(notifications)
      .where(eq(notifications.eventId, res.json.eventId))
    expect(sent.length).toBe(booked.length * 2)

    // Nothing can be recorded against a cancelled session.
    const mark = await call('POST', '/api/attendance/mark', {
      rsvpId: booked[0]?.id,
      status: 'attended',
    })
    expect(mark.status).toBe(409)
  })

  test('admins may manage any trainer’s session', async () => {
    as(ADMIN)
    expect((await call('GET', `/api/sessions/${sessionId('SES-T02-2')}`)).status).toBe(200)
  })
})
