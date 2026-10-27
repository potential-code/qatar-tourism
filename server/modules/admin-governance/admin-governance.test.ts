import '../../__tests__/helpers/env'

import { afterEach, beforeAll, describe, expect, mock, setDefaultTimeout, test } from 'bun:test'
import { db } from '@server/db/connection'
import { auditEvents } from '@server/db/schema'
import { reseed } from '@server/db/seed'
import { EXPORT_BLOCKED_MESSAGE } from '@shared/permissions'
import { and, eq } from 'drizzle-orm'
import { stubSession } from '../../__tests__/helpers/session'
import { adminTestApp as app } from '../admin-api/admin-test-app'

setDefaultTimeout(120_000)

beforeAll(async () => {
  await reseed({ referenceDate: '2026-10-27' })
})

afterEach(() => {
  mock.restore()
})

describe('governance', () => {
  test('hub counts come from the database', async () => {
    stubSession('admin')
    const body = await (await app.request('/api/admin/governance/overview')).json()
    expect(body.counts).toMatchObject({
      users: 1211,
      learners: 1200,
      trainers: 10,
      programmes: 3,
      courses: 7,
      sessions: 30,
    })
  })

  test('the permission matrix lists the nine brief rows first', async () => {
    stubSession('admin')
    const body = await (await app.request('/api/admin/governance/permissions')).json()
    expect(body.rows.filter((r: { fromBrief: boolean }) => r.fromBrief)).toHaveLength(9)
    expect(body.blockedExportMessage).toBe(EXPORT_BLOCKED_MESSAGE)
    const trainer = body.fields.find((f: { role: string }) => f.role === 'trainer')
    expect(trainer.fields).toEqual(['learnerCode', 'displayName'])
  })

  test('integrations are Demo or Not connected, never Connected, with evidence', async () => {
    stubSession('admin')
    const body = await (await app.request('/api/admin/governance/integrations')).json()
    expect(body.items).toHaveLength(4)
    for (const item of body.items) {
      expect(['Demo', 'Not connected']).toContain(item.state)
      expect(item.evidence.length).toBeGreaterThan(0)
    }
    expect(body.items.find((i: { key: string }) => i.key === 'crm').state).toBe('Not connected')
  })

  test('audit log filters by outcome and action', async () => {
    stubSession('admin')
    const denied = await (await app.request('/api/admin/governance/audit?outcome=denied')).json()
    expect(denied.total).toBeGreaterThan(0)
    expect(denied.items.every((e: { outcome: string }) => e.outcome === 'denied')).toBe(true)
    const issued = await (
      await app.request('/api/admin/governance/audit?action=certificate.issue&pageSize=50')
    ).json()
    expect(issued.total).toBe(120)
    expect(issued.items).toHaveLength(50)
  })

  test('the audit CSV export respects filters, hides contact data and is audited', async () => {
    stubSession('admin')
    const res = await app.request(
      '/api/admin/governance/audit/export?action=export.learner_personal_data',
    )
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/csv')
    const text = await res.text()
    const lines = text.trim().split('\r\n')
    expect(lines).toHaveLength(2)
    expect(text).not.toContain('@example.com')
    const [event] = await db
      .select()
      .from(auditEvents)
      .where(
        and(eq(auditEvents.action, 'export.report_csv'), eq(auditEvents.objectId, 'audit-log')),
      )
    expect(((event?.after ?? {}) as { rows?: number }).rows).toBe(1)
  })

  for (const role of ['learner', 'trainer'] as const) {
    test(`${role} gets 403`, async () => {
      stubSession(role)
      for (const path of ['overview', 'permissions', 'integrations', 'audit', 'audit/export']) {
        expect((await app.request(`/api/admin/governance/${path}`)).status).toBe(403)
      }
    })
  }
})
