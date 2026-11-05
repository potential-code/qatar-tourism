import { beforeEach, describe, expect, test } from 'bun:test'
import type { DemoDb } from '@/mocks/db'
import { insertRow, nowIso } from '../api'
import { listLog, listMine, markRead, notify, notifyEach } from '../notifications.service'
import { actAs, freshDemo } from './helpers'

let db: DemoDb

beforeEach(() => {
  db = freshDemo()
})

const message = {
  eventId: 'evt-test-1',
  kind: 'session_rescheduled',
  subject: 'Moved',
  body: 'Your session has moved.',
}

describe('notify', () => {
  test('one in-app (sent) and one email (simulated) per recipient', () => {
    expect(notify({ ...message, recipientIds: ['user-l0001', 'user-l0002'] })).toBe(4)
    const rows = db.notifications.filter((n) => n.eventId === 'evt-test-1')
    expect(rows.filter((n) => n.channel === 'in_app').every((n) => n.state === 'sent')).toBe(true)
    expect(rows.filter((n) => n.channel === 'email').every((n) => n.state === 'simulated')).toBe(
      true,
    )
  })

  test('retrying the same event creates nothing new (dedupe key)', () => {
    notify({ ...message, recipientIds: ['user-l0001'] })
    const total = db.notifications.length
    expect(notify({ ...message, recipientIds: ['user-l0001'] })).toBe(0)
    expect(notify({ ...message, recipientIds: ['user-l0001', 'user-l0003'] })).toBe(2)
    expect(db.notifications).toHaveLength(total + 2)
  })

  test('notifyEach counts recipients newly notified', () => {
    const messages = [
      { recipientId: 'user-l0001', subject: 'Hi Maha', body: 'b' },
      { recipientId: 'user-l0002', subject: 'Hi Omar', body: 'b' },
    ]
    expect(notifyEach({ eventId: 'evt-each', kind: 'k' }, messages)).toBe(2)
    expect(notifyEach({ eventId: 'evt-each', kind: 'k' }, messages)).toBe(0)
  })
})

describe('the bell', () => {
  test('lists only my in-app messages and marks only mine read', async () => {
    notify({ ...message, recipientIds: ['user-l0001', 'user-l0002'] })
    actAs(db, 'user-l0001')
    const mine = await listMine()
    expect(mine.items.every((n) => n.eventId)).toBe(true)
    expect(mine.items[0]?.subject).toBe('Moved')
    const unread = mine.unread
    expect(unread).toBeGreaterThan(0)

    const others = db.notifications.filter((n) => n.recipientId === 'user-l0002')
    await markRead(others.map((n) => n.id))
    expect(others.every((n) => n.readAt === null)).toBe(true)

    expect((await markRead()).updated).toBeGreaterThanOrEqual(unread)
    expect((await listMine()).unread).toBe(0)
  })

  test('needs a session', async () => {
    actAs(db, null)
    await expect(listMine()).rejects.toMatchObject({ status: 401 })
  })
})

describe('notification log', () => {
  test("a trainer sees their own sessions' messages only; a learner is refused", async () => {
    const change = db.sessionReschedules[0]
    const session = db.sessions.find((s) => s.id === change?.sessionId)
    const owner = db.trainerProfiles.find((t) => t.id === session?.trainerId)
    const other = db.trainerProfiles.find((t) => t.id !== session?.trainerId)
    if (!owner || !other) throw new Error('missing trainers')

    actAs(db, owner.userId)
    const own = await listLog({ eventId: change?.eventId })
    expect(own.items).toHaveLength(36)
    expect(own.items.every((n) => n.learnerCode.startsWith('L'))).toBe(true)

    actAs(db, other.userId)
    expect((await listLog({ eventId: change?.eventId })).items).toHaveLength(0)

    actAs(db, 'user-l0001')
    await expect(listLog()).rejects.toMatchObject({ status: 403 })
  })
})

describe('the bell by programme', () => {
  /** A learner enrolled in A and B, with a session in each and a B submission. */
  function dualLearner() {
    const code = (programmeId: string) => db.programmes.find((p) => p.id === programmeId)?.code
    const learnerIds = [...new Set(db.enrolments.map((e) => e.learnerId))]
    const userId = learnerIds.find((id) => {
      const held = db.enrolments.filter((e) => e.learnerId === id).map((e) => code(e.programmeId))
      return held.includes('A') && held.includes('B')
    })
    if (!userId) throw new Error('no A and B learner in the seed')
    const sessionIn = (c: string) => db.sessions.find((s) => code(s.programmeId) === c)
    const sessionA = sessionIn('A')
    const sessionB = sessionIn('B')
    const enrolmentB = db.enrolments.find(
      (e) => e.learnerId === userId && code(e.programmeId) === 'B',
    )
    const assignmentB = db.assignments.find((a) => a.programmeId === enrolmentB?.programmeId)
    if (!sessionA || !sessionB || !enrolmentB || !assignmentB) throw new Error('missing seed rows')
    const submission = insertRow('submissions', {
      assignmentId: assignmentB.id,
      enrolmentId: enrolmentB.id,
      learnerId: userId,
      version: 1,
      status: 'submitted',
      submittedAt: nowIso(),
    })
    return { userId, sessionA, sessionB, submissionB: submission.id }
  }

  test('a learner in A and B sees the active programme plus unlinked messages', async () => {
    const { userId, sessionA, sessionB, submissionB } = dualLearner()
    const to = { recipientIds: [userId], kind: 'k', body: 'b' }
    notify({ ...to, eventId: 'evt-a', subject: 'A session', sessionId: sessionA.id })
    notify({ ...to, eventId: 'evt-b', subject: 'B session', sessionId: sessionB.id })
    notify({ ...to, eventId: `evt-return-${submissionB}`, subject: 'B returned' })
    notify({ ...to, eventId: 'evt-account', subject: 'Account' })
    actAs(db, userId)

    const subjects = async (programme?: 'A' | 'B') =>
      (await listMine({ programme })).items.map((n) => n.subject).sort()
    expect(await subjects('A')).toEqual(expect.arrayContaining(['A session', 'Account']))
    expect(await subjects('A')).not.toContain('B session')
    expect(await subjects('A')).not.toContain('B returned')
    expect(await subjects('B')).toEqual(
      expect.arrayContaining(['Account', 'B returned', 'B session']),
    )
    expect(await subjects('B')).not.toContain('A session')
    expect(await subjects()).toEqual(
      expect.arrayContaining(['A session', 'Account', 'B returned', 'B session']),
    )

    const unreadB = (await listMine({ programme: 'B' })).unread
    expect(unreadB).toBeLessThan((await listMine()).unread)
    await markRead(undefined, { programme: 'B' })
    expect((await listMine({ programme: 'B' })).unread).toBe(0)
    const a = (await listMine({ programme: 'A' })).items.find((n) => n.subject === 'A session')
    expect(a?.readAt).toBeNull()
  })

  test('the programme filter never widens the user scope', async () => {
    const { userId, sessionB } = dualLearner()
    notify({
      recipientIds: [userId],
      kind: 'k',
      body: 'b',
      eventId: 'evt-x',
      subject: 'Theirs',
      sessionId: sessionB.id,
    })
    actAs(db, 'user-l0002')
    const mine = await listMine({ programme: 'B' })
    expect(mine.items.some((n) => n.subject === 'Theirs')).toBe(false)
    await expect(listMine({ programme: 'Z' as 'A' })).rejects.toMatchObject({ status: 400 })
  })
})
