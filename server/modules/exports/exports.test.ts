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
import { auditEvents } from '@server/db/schema'
import { EXPORT_BLOCKED_MESSAGE } from '@shared/permissions'
import { and, desc, eq } from 'drizzle-orm'
import { ADMIN, call, freshSeed, OMAR, sessionId, signInAs, T01 } from '../sessions/test-support'

setDefaultTimeout(120_000)

beforeAll(freshSeed)
afterAll(freshSeed)
afterEach(() => mock.restore())

const as = (who: readonly [string, 'learner' | 'trainer' | 'admin', string]) =>
  signInAs(who[0], who[1], who[2])

async function lastAudit(actorId: string, action: string) {
  const [row] = await db
    .select()
    .from(auditEvents)
    .where(and(eq(auditEvents.actorId, actorId), eq(auditEvents.action, action)))
    .orderBy(desc(auditEvents.createdAt))
    .limit(1)
  return row
}

describe('exports (brief §11)', () => {
  test('a trainer may export learner ID and score only, for their own session', async () => {
    as(T01)
    const res = await call('GET', `/api/exports/sessions/${sessionId('SES-T01-1')}/marks`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/csv')
    const [header] = res.text.replace('﻿', '').split('\r\n')
    expect(header).toBe('Learner ID,Score')
    expect((await lastAudit(T01[0], 'export.marks'))?.outcome).toBe('allowed')
  })

  test('a personal-data export is blocked for trainers and audited as denied', async () => {
    as(T01)
    const res = await call('GET', `/api/exports/sessions/${sessionId('SES-T01-1')}/personal`)
    expect(res.status).toBe(403)
    expect(res.json.error.message).toBe(EXPORT_BLOCKED_MESSAGE)
    const audit = await lastAudit(T01[0], 'export.personal')
    expect(audit?.outcome).toBe('denied')
    expect(audit?.actorRole).toBe('trainer')
  })

  test("Trainer 1 cannot export Trainer 2's marks by changing the ID", async () => {
    as(T01)
    const res = await call('GET', `/api/exports/sessions/${sessionId('SES-T02-1')}/marks`)
    expect(res.status).toBe(403)
    const audit = await lastAudit(T01[0], 'export.marks')
    expect(audit?.outcome).toBe('denied')
    expect(audit?.objectId).toBe(sessionId('SES-T02-1'))
  })

  test('learners are blocked; admins keep authorised access', async () => {
    as(OMAR)
    expect(
      (await call('GET', `/api/exports/sessions/${sessionId('SES-T01-1')}/marks`)).status,
    ).toBe(403)
    expect((await call('GET', '/api/exports/learners?programme=A')).status).toBe(403)

    as(ADMIN)
    const roster = await call('GET', `/api/exports/sessions/${sessionId('SES-T01-1')}/personal`)
    expect(roster.status).toBe(200)
    expect(roster.text).toContain('Display name')
    expect(roster.text).not.toContain('@example.com')
    const learners = await call('GET', '/api/exports/learners?programme=A')
    expect(learners.status).toBe(200)
    expect(learners.headers.get('x-export-rows')).toBe('420')
  })
})
