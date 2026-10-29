import { beforeEach, describe, expect, test } from 'bun:test'
import type { DemoDb } from '@/mocks/db'
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
