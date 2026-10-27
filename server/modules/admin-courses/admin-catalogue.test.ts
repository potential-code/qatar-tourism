import '../../__tests__/helpers/env'

import { afterEach, beforeAll, describe, expect, mock, setDefaultTimeout, test } from 'bun:test'
import { db } from '@server/db/connection'
import { assessments, auditEvents, courses, sessions } from '@server/db/schema'
import { reseed } from '@server/db/seed'
import { eq } from 'drizzle-orm'
import { CLIENT_ORIGIN } from '../../__tests__/helpers/env'
import { stubSession } from '../../__tests__/helpers/session'
import { adminTestApp as app } from '../admin-api/admin-test-app'

setDefaultTimeout(120_000)

const patch = (body: unknown) => ({
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json', Origin: CLIENT_ORIGIN },
  body: JSON.stringify(body),
})

beforeAll(async () => {
  await reseed({ referenceDate: '2026-10-27' })
})

afterEach(() => {
  mock.restore()
})

describe('courses', () => {
  test('lists C01 to C07 with packages; C04 is the SCORM 2004 sample package', async () => {
    stubSession('admin')
    const body = await (await app.request('/api/admin/courses')).json()
    expect(body.items.map((c: { code: string }) => c.code)).toEqual([
      'C01',
      'C02',
      'C03',
      'C04',
      'C05',
      'C06',
      'C07',
    ])
    const c04 = body.items.find((c: { code: string }) => c.code === 'C04')
    expect(
      c04.packages.some((p: { formatLabel: string }) => p.formatLabel.includes('SCORM 2004')),
    ).toBe(true)
  })

  test('editing a course is audited', async () => {
    const [c03] = await db.select().from(courses).where(eq(courses.code, 'C03'))
    stubSession('admin')
    const res = await app.request(
      `/api/admin/courses/${c03?.id}`,
      patch({ summary: 'Clear and inclusive communication with every visitor, updated.' }),
    )
    expect(res.status).toBe(200)
    const events = await db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.action, 'course.update'))
    expect(events[0]?.objectId).toBe('C03')
  })
})

describe('sessions', () => {
  test('lists 30 sessions; detail includes roster and reschedule history', async () => {
    stubSession('admin')
    const body = await (await app.request('/api/admin/sessions')).json()
    expect(body.items).toHaveLength(30)
    const moved = body.items.find((s: { reschedules: number }) => s.reschedules > 0)
    const detail = await (await app.request(`/api/admin/sessions/${moved.id}`)).json()
    expect(detail.reschedules[0].affectedRsvps).toBe(18)
    expect(detail.roster.length).toBeGreaterThan(0)
  })
})

describe('assessments', () => {
  test('lists the three assessment versions with attempt counts', async () => {
    stubSession('admin')
    const body = await (await app.request('/api/admin/assessments')).json()
    expect(body.items.map((a: { code: string }) => a.code).sort()).toEqual([
      'FOUNDATION-V1',
      'POST-V1',
      'PRE-V1',
    ])
    expect(body.items.find((a: { code: string }) => a.code === 'POST-V1').attempts).toBe(420)
  })

  test('a pass-mark change needs a reason and is audited; the baseline has no pass mark', async () => {
    const [post] = await db.select().from(assessments).where(eq(assessments.code, 'POST-V1'))
    const [pre] = await db.select().from(assessments).where(eq(assessments.code, 'PRE-V1'))
    stubSession('admin')
    expect(
      (await app.request(`/api/admin/assessments/${post?.id}`, patch({ passPercent: 75 }))).status,
    ).toBe(400)
    expect(
      (
        await app.request(
          `/api/admin/assessments/${pre?.id}`,
          patch({ passPercent: 60, reason: 'Trying a pass mark' }),
        )
      ).status,
    ).toBe(400)
    const ok = await app.request(
      `/api/admin/assessments/${post?.id}`,
      patch({ passPercent: 75, reason: 'Demo calibration' }),
    )
    expect(ok.status).toBe(200)
    const events = await db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.action, 'assessment.update'))
    expect(events[0]?.before).toMatchObject({ passPercent: 80 })
  })
})

describe('access', () => {
  for (const role of ['learner', 'trainer'] as const) {
    test(`${role} gets 403 on courses, sessions and assessments`, async () => {
      const [s] = await db.select({ id: sessions.id }).from(sessions).limit(1)
      stubSession(role)
      expect((await app.request('/api/admin/courses')).status).toBe(403)
      expect((await app.request('/api/admin/sessions')).status).toBe(403)
      expect((await app.request(`/api/admin/sessions/${s?.id}`)).status).toBe(403)
      expect((await app.request('/api/admin/assessments')).status).toBe(403)
    })
  }
})
