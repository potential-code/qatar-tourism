import { beforeEach, describe, expect, test } from 'bun:test'
import { EXPORT_BLOCKED_MESSAGE } from '@shared/permissions'
import { buildCsv } from '@shared/utils/csv'
import type { DemoDb } from '@/mocks/db'
import { exportReportCsv, getReportPage } from '../reports.service'
import { actAs, freshDemo } from './helpers'

const ADMIN = 'user-admin'

let db: DemoDb

beforeEach(() => {
  db = freshDemo()
  actAs(db, ADMIN)
})

const lines = (csv: string) => csv.replace(/^﻿/, '').trim().split('\r\n')

describe('reports reconcile with the metric layer', () => {
  test('programme reports: A 420, B 660, C 180; certification 120, Program A only', async () => {
    expect((await getReportPage('program-a')).total).toBe(420)
    expect((await getReportPage('program-b')).total).toBe(660)
    expect((await getReportPage('program-c')).total).toBe(180)
    expect((await getReportPage('certification')).total).toBe(120)
    expect((await getReportPage('certification', { programme: 'B' })).total).toBe(0)
  })

  test('30 sessions, 10 trainers, and every report loads', async () => {
    expect((await getReportPage('sessions')).total).toBe(30)
    expect((await getReportPage('trainers')).total).toBe(10)
    for (const key of ['assessments', 'assignments', 'notifications', 'attention'] as const) {
      expect((await getReportPage(key)).total).toBeGreaterThan(0)
    }
  })

  test('notifications groups events and reports simulated email honestly', async () => {
    const body = await getReportPage('notifications', { pageSize: 100 })
    const rescheduled = body.items.find((row) => row.event === 'Session rescheduled')
    expect(rescheduled).toMatchObject({ recipients: 18, state: 'Simulated' })
    expect(body.items.some((row) => row.state === 'Denied')).toBe(true)
  })
})

describe('search, sort, status and paging', () => {
  test('search finds Maha by name', async () => {
    const body = await getReportPage('learners', { search: 'maha al nouri' })
    expect(body.total).toBe(1)
    expect(body.items[0]?.learnerCode).toBe('L0001')
  })

  test('status filter and descending sort', async () => {
    const body = await getReportPage('program-b', {
      rowStatus: 'Completed',
      sort: 'post',
      direction: 'desc',
    })
    expect(body.total).toBe(300)
    const posts = body.items.map((row) => Number(row.post))
    expect(posts).toEqual([...posts].sort((a, b) => b - a))
    expect(body.sort).toEqual({ key: 'post', direction: 'desc' })
  })

  test('pages of 25, 50 and 100 do not overlap; other sizes are refused', async () => {
    expect((await getReportPage('learners')).items).toHaveLength(25)
    expect((await getReportPage('learners', { pageSize: 50 })).items).toHaveLength(50)
    const first = await getReportPage('learners', { pageSize: 100, page: 1 })
    const second = await getReportPage('learners', { pageSize: 100, page: 2 })
    expect(first.items).toHaveLength(100)
    const ids = new Set(first.items.map((row) => row.id))
    expect(second.items.some((row) => ids.has(row.id))).toBe(false)
    await expect(getReportPage('learners', { pageSize: 30 })).rejects.toMatchObject({
      status: 400,
    })
  })

  test('an unknown status value or report is a 400', async () => {
    await expect(getReportPage('sessions', { rowStatus: 'Bogus' })).rejects.toMatchObject({
      status: 400,
    })
    await expect(getReportPage('payroll' as 'learners')).rejects.toMatchObject({ status: 400 })
  })
})

describe('field permissions', () => {
  test('contact fields are stripped from the page and listed as hidden', async () => {
    const body = await getReportPage('learners')
    expect(body.columns.map((c) => c.key)).not.toContain('email')
    expect(body.hiddenColumns).toContain('Email')
    expect(JSON.stringify(body.items)).not.toContain('@example.com')
  })

  test('sorting by a hidden field falls back to the default order', async () => {
    const body = await getReportPage('learners', { sort: 'email', direction: 'desc' })
    expect(body.items[0]?.learnerCode).toBe('L0001')
  })
})

describe('CSV export', () => {
  test('respects filters, omits hidden fields and is audited', async () => {
    const result = await exportReportCsv('program-b', { rowStatus: 'Completed' })
    expect(result.filename).toMatch(/^program-b-users-\d{4}-\d{2}-\d{2}\.csv$/)
    const rows = lines(result.csv)
    expect(rows).toHaveLength(301)
    expect(rows[0]).toContain('Learner ID')
    expect(rows[0]).not.toContain('Email')
    expect(result.csv).not.toContain('@example.com')
    const event = db.auditEvents.find(
      (e) => e.action === 'export.report_csv' && e.objectId === 'program-b',
    )
    expect(event?.outcome).toBe('allowed')
    expect((event?.after as { rows: number } | null)?.rows).toBe(300)
  })

  test('a text cell that starts like a formula is neutralised', async () => {
    const profile = db.profiles.find((p) => p.learnerCode === 'L0001')
    if (!profile) throw new Error('no Maha')
    profile.jobTitle = '=HYPERLINK("http://evil.example")'
    const { csv } = await exportReportCsv('learners', { search: 'L0001' })
    expect(csv).toContain(`"'=HYPERLINK(""http://evil.example"")"`)
    expect(buildCsv([{ header: 'n', value: (n: number) => n }], [-5])).toContain('\r\n-5\r\n')
  })

  for (const [role, id] of [
    ['learner', 'user-l0001'],
    ['trainer', 'user-t03'],
  ] as const) {
    test(`a ${role} is blocked with the brief's message, and the attempt is audited`, async () => {
      actAs(db, id)
      await expect(exportReportCsv('learners')).rejects.toMatchObject({
        status: 403,
        code: 'EXPORT_BLOCKED',
        message: EXPORT_BLOCKED_MESSAGE,
      })
      expect(
        db.auditEvents.some(
          (e) => e.action === 'export.denied' && e.actorId === id && e.outcome === 'denied',
        ),
      ).toBe(true)
    })
  }
})

describe('access', () => {
  for (const id of ['user-l0001', 'user-t01']) {
    test(`${id} is refused report pages`, async () => {
      actAs(db, id)
      await expect(getReportPage('learners')).rejects.toMatchObject({ status: 403 })
    })
  }
})
