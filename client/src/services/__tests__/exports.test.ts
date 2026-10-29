import { beforeEach, describe, expect, test } from 'bun:test'
import { EXPORT_BLOCKED_MESSAGE } from '@shared/permissions'
import type { DemoDb } from '@/mocks/db'
import {
  exportProgrammeLearners,
  exportSessionMarks,
  exportSessionPersonal,
} from '../exports.service'
import { actAs, freshDemo } from './helpers'
import { ADMIN, OMAR, rejection, sessionId, T01 } from './sessions-support'

let db: DemoDb

beforeEach(() => {
  db = freshDemo()
})

const lastAudit = (actorId: string, action: string) =>
  db.auditEvents
    .filter((e) => e.actorId === actorId && e.action === action)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]

describe('exports (brief §11)', () => {
  test('a trainer may export learner ID and score only, for their own session', async () => {
    actAs(db, T01)
    const file = await exportSessionMarks(sessionId('SES-T01-1'))
    const [header, ...lines] = file.csv.replace('﻿', '').split('\r\n').filter(Boolean)
    expect(header).toBe('Learner ID,Score')
    expect(lines).toHaveLength(file.rows)
    expect(file.filename).toMatch(/^ses-t01-1-marks-.*\.csv$/)
    const audit = lastAudit(T01, 'export.marks')
    expect(audit?.outcome).toBe('allowed')
    expect(audit?.after).toMatchObject({ rows: file.rows })
  })

  test('a personal-data export is blocked for trainers and audited as denied', async () => {
    actAs(db, T01)
    const res = await rejection(exportSessionPersonal(sessionId('SES-T01-1')))
    expect(res.status).toBe(403)
    expect(res.code).toBe('EXPORT_BLOCKED')
    expect(res.message).toBe(EXPORT_BLOCKED_MESSAGE)
    const audit = lastAudit(T01, 'export.personal')
    expect(audit?.outcome).toBe('denied')
    expect(audit?.actorRole).toBe('trainer')
  })

  test("Trainer 1 cannot export Trainer 2's marks by changing the ID", async () => {
    actAs(db, T01)
    const other = sessionId('SES-T02-1')
    expect((await rejection(exportSessionMarks(other))).status).toBe(403)
    const audit = lastAudit(T01, 'export.marks')
    expect(audit?.outcome).toBe('denied')
    expect(audit?.objectId).toBe(other)
  })

  test('learners are blocked; admins keep authorised access', async () => {
    actAs(db, OMAR)
    expect((await rejection(exportSessionMarks(sessionId('SES-T01-1')))).status).toBe(403)
    expect((await rejection(exportProgrammeLearners('A'))).status).toBe(403)

    actAs(db, ADMIN)
    const roster = await exportSessionPersonal(sessionId('SES-T01-1'))
    expect(roster.csv).toContain('Display name')
    expect(roster.csv).not.toContain('@example.com')
    const learners = await exportProgrammeLearners('A')
    expect(learners.rows).toBe(420)
  })
})
