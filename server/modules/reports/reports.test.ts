import '../../__tests__/helpers/env'

import { afterEach, beforeAll, describe, expect, mock, setDefaultTimeout, test } from 'bun:test'
import { app } from '@server/app'
import { db } from '@server/db/connection'
import { auditEvents } from '@server/db/schema'
import { reseed } from '@server/db/seed'
import { EXPORT_BLOCKED_MESSAGE } from '@shared/permissions'
import { and, eq } from 'drizzle-orm'
import { stubSession } from '../../__tests__/helpers/session'

setDefaultTimeout(120_000)

beforeAll(async () => {
  await reseed({ referenceDate: '2026-10-27' })
})

afterEach(() => {
  mock.restore()
})

type Page = {
  total: number
  items: Record<string, unknown>[]
  columns: { key: string }[]
  hiddenColumns: string[]
  summary: { label: string; value: string }[]
}

async function page(path: string): Promise<Page> {
  stubSession('admin')
  const res = await app.request(`/api/reports/${path}`)
  expect(res.status).toBe(200)
  return (await res.json()) as Page
}

describe('reports reconcile with the metric layer', () => {
  test('all learners: 1,260 enrolment rows and 1,200 unique learners', async () => {
    const body = await page('learners')
    expect(body.total).toBe(1260)
    expect(body.items).toHaveLength(25)
    expect(body.summary).toEqual([
      { label: 'Enrolments', value: '1,260' },
      { label: 'Unique learners', value: '1,200' },
    ])
  })

  test('programme reports: A 420, B 660, C 180', async () => {
    expect((await page('program-a')).total).toBe(420)
    expect((await page('program-b')).total).toBe(660)
    expect((await page('program-c')).total).toBe(180)
  })

  test('certification: 120 issued, Program A only', async () => {
    const body = await page('certification?pageSize=100')
    expect(body.total).toBe(120)
    const b = await page('certification?programme=B')
    expect(b.total).toBe(0)
  })

  test('pending view of assignments matches the 90 pending assessments KPI', async () => {
    expect((await page('assignments?view=pending')).total).toBe(90)
  })

  test('30 sessions; 10 trainers', async () => {
    expect((await page('sessions')).total).toBe(30)
    expect((await page('trainers')).total).toBe(10)
  })

  test('notifications groups events and reports simulated email honestly', async () => {
    const body = await page('notifications?pageSize=100')
    const rescheduled = body.items.find((row) => row.event === 'Session rescheduled')
    expect(rescheduled).toMatchObject({ recipients: 18, state: 'Simulated' })
    expect(body.items.some((row) => row.state === 'Denied')).toBe(true)
  })
})

describe('search, sort, status and paging', () => {
  test('search finds Maha by name', async () => {
    const body = await page('learners?search=maha%20al%20nouri')
    expect(body.total).toBe(1)
    expect(body.items[0]?.learnerCode).toBe('L0001')
  })

  test('status filter and descending sort', async () => {
    const body = await page('program-b?rowStatus=Completed&sort=post&direction=desc')
    expect(body.total).toBe(300)
    const posts = body.items.map((row) => Number(row.post))
    expect(posts).toEqual([...posts].sort((a, b) => b - a))
  })

  test('page size 50 and 100 are allowed, 30 is not', async () => {
    expect((await page('learners?pageSize=100')).items).toHaveLength(100)
    stubSession('admin')
    expect((await app.request('/api/reports/learners?pageSize=30')).status).toBe(400)
  })

  test('an unknown status value is a 400', async () => {
    stubSession('admin')
    expect((await app.request('/api/reports/sessions?rowStatus=Bogus')).status).toBe(400)
  })

  test('an unknown report is a 400', async () => {
    stubSession('admin')
    expect((await app.request('/api/reports/payroll')).status).toBe(400)
  })
})

describe('field permissions', () => {
  test('contact fields are stripped from the page and listed as hidden', async () => {
    const body = await page('learners')
    expect(body.columns.map((c) => c.key)).not.toContain('email')
    expect(body.hiddenColumns).toContain('Email')
    expect(JSON.stringify(body.items)).not.toContain('@example.com')
  })

  test('sorting by a hidden field falls back to the default order', async () => {
    const body = await page('learners?sort=email&direction=desc')
    expect(body.items[0]?.learnerCode).toBe('L0001')
  })
})

describe('CSV export', () => {
  test('admin export respects filters, omits hidden fields and is audited', async () => {
    stubSession('admin')
    const res = await app.request('/api/reports/program-b/export?rowStatus=Completed')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/csv')
    expect(res.headers.get('content-disposition')).toMatch(/attachment; filename="program-b-users-/)
    const text = await res.text()
    const lines = text.trim().split('\r\n')
    expect(lines).toHaveLength(301)
    expect(lines[0]).toContain('Learner ID')
    expect(lines[0]).not.toContain('Email')
    expect(text).not.toContain('@example.com')

    const [event] = await db
      .select()
      .from(auditEvents)
      .where(
        and(eq(auditEvents.action, 'export.report_csv'), eq(auditEvents.objectId, 'program-b')),
      )
    expect(event?.outcome).toBe('allowed')
    expect((event?.after as { rows: number } | null)?.rows).toBe(300)
  })

  for (const [role, id] of [
    ['learner', 'user-l0001'],
    ['trainer', 'user-t03'],
  ] as const) {
    test(`${role}: blocked with the brief's message, and the attempt is audited`, async () => {
      // A real seeded account, so the audit row's actor foreign key holds.
      stubSession(role).mockResolvedValue({
        user: { id, name: id, email: `${id}@example.com`, role },
        session: { id: 's', userId: id },
      } as never)
      const res = await app.request('/api/reports/learners/export')
      expect(res.status).toBe(403)
      expect((await res.json()).error.message).toBe(EXPORT_BLOCKED_MESSAGE)
      const denied = await db
        .select()
        .from(auditEvents)
        .where(and(eq(auditEvents.action, 'export.denied'), eq(auditEvents.actorId, id)))
      expect(denied.length).toBeGreaterThan(0)
    })
  }
})

describe('access', () => {
  for (const role of ['learner', 'trainer'] as const) {
    test(`${role} gets 403 on report pages`, async () => {
      stubSession(role)
      expect((await app.request('/api/reports/learners')).status).toBe(403)
    })
  }
})
