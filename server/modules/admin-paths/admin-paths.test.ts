import '../../__tests__/helpers/env'

import { afterEach, beforeAll, describe, expect, mock, setDefaultTimeout, test } from 'bun:test'
import { db } from '@server/db/connection'
import {
  assignmentRules,
  auditEvents,
  enrolments,
  learningPaths,
  pathVersions,
  profiles,
  unitProgress,
} from '@server/db/schema'
import { reseed } from '@server/db/seed'
import { and, count, eq } from 'drizzle-orm'
import { CLIENT_ORIGIN } from '../../__tests__/helpers/env'
import { stubSession } from '../../__tests__/helpers/session'
import { adminTestApp as app } from '../admin-api/admin-test-app'

setDefaultTimeout(120_000)

beforeAll(async () => {
  await reseed({ referenceDate: '2026-10-27' })
})

afterEach(() => {
  mock.restore()
})

const send = (method: string, body?: unknown) => ({
  method,
  headers: { 'Content-Type': 'application/json', Origin: CLIENT_ORIGIN },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
})

async function as<T>(path: string, init?: RequestInit, status = 200): Promise<T> {
  stubSession('admin')
  const res = await app.request(`/api/admin/paths${path}`, init)
  if (res.status !== status) throw new Error(`${path}: ${res.status} ${await res.text()}`)
  return (await res.json()) as T
}

async function pathId(code: string) {
  const [row] = await db
    .select({ id: learningPaths.id })
    .from(learningPaths)
    .where(eq(learningPaths.code, code))
  if (!row) throw new Error(`no path ${code}`)
  return row.id
}

type Preview = {
  resolution: { pathCode: string; priority: number; usedDefault: boolean; reason: string }
  evaluations: { name: string; winner: boolean; result: { pass: boolean } }[]
  profile: { organisationType: string; baselineWeakCompetency: string | null }
}

async function savedRuleInputs() {
  const rows = await db.select().from(assignmentRules)
  const bRules = await as<{ rules: { id: string; programme: string }[] }>('')
  return rows
    .filter((r) => bRules.rules.find((x) => x.id === r.id)?.programme === 'B')
    .map((r) => ({
      id: r.id,
      name: r.name,
      programme: 'B' as const,
      pathId: r.pathId,
      priority: r.priority,
      isDefault: r.isDefault,
      conditions: r.conditions,
      summary: r.summary,
      status: r.status,
    }))
}

describe('rule priority resolution (brief §14)', () => {
  test("Maha's saved rules resolve to B Hotel guest services at priority 20", async () => {
    const body = await as<Preview>(
      '/preview',
      send('POST', { programme: 'B', learnerCode: 'L0001' }),
    )
    expect(body.resolution).toMatchObject({ pathCode: 'B-HOTEL', priority: 20, usedDefault: false })
    expect(body.profile.organisationType).toBe('hotel_accommodation')
    expect(body.evaluations.filter((e) => e.winner)).toHaveLength(1)
  })

  test('a lower-priority rule that also matches does not win', async () => {
    const rules = await savedRuleInputs()
    const transport = await pathId('B-TRANSPORT')
    rules.push({
      name: 'Guest services to transport (test)',
      programme: 'B',
      pathId: transport,
      priority: 10,
      isDefault: false,
      conditions: {
        op: 'AND',
        conditions: [{ field: 'jobFunction', operator: 'eq', value: 'guest_services' }],
      },
      summary: 'Crafted overlap',
      status: 'published',
    } as never)
    const body = await as<Preview>(
      '/preview',
      send('POST', { programme: 'B', learnerCode: 'L0001', rules }),
    )
    expect(body.resolution.pathCode).toBe('B-HOTEL')
    expect(
      body.evaluations.filter((e) => e.result.pass && !e.name.includes('General')).length,
    ).toBe(2)
  })

  test('a new, higher-priority rule wins once saved', async () => {
    const transport = await pathId('B-TRANSPORT')
    await as(
      '/rules',
      send('POST', {
        name: 'Complaint handlers practise directions',
        programme: 'B',
        pathId: transport,
        priority: 50,
        conditions: {
          op: 'OR',
          conditions: [{ field: 'goals', operator: 'includes_any', value: ['complaint_handling'] }],
        },
        summary: 'Goals include complaint handling',
        status: 'published',
      }),
      201,
    )
    const body = await as<Preview>(
      '/preview',
      send('POST', { programme: 'B', learnerCode: 'L0001' }),
    )
    expect(body.resolution).toMatchObject({ pathCode: 'B-TRANSPORT', priority: 50 })
    const [event] = await db.select().from(auditEvents).where(eq(auditEvents.action, 'rule.create'))
    expect(event?.actorId).toBe('user-admin')
  })

  test('an incomplete (draft) profile always gets the default path', async () => {
    const [draft] = await db
      .select({ code: profiles.learnerCode })
      .from(profiles)
      .where(eq(profiles.status, 'draft'))
      .limit(1)
    const body = await as<Preview>(
      '/preview',
      send('POST', { programme: 'B', learnerCode: draft?.code ?? 'L9999' }),
    )
    expect(body.resolution).toMatchObject({ pathCode: 'B-GENERAL', usedDefault: true })
    expect(body.resolution.reason).toContain('profile incomplete')
  })

  test('a non-default rule with no conditions is rejected', async () => {
    stubSession('admin')
    const res = await app.request(
      '/api/admin/paths/rules',
      send('POST', {
        name: 'Empty',
        programme: 'B',
        pathId: await pathId('B-HOTEL'),
        priority: 5,
        conditions: { op: 'AND', conditions: [] },
        summary: 'Empty rule',
      }),
    )
    expect(res.status).toBe(400)
  })
})

describe('versioning keeps existing learners and completion records', () => {
  test('edit a draft, publish v2: enrolments stay on v1, completed progress untouched', async () => {
    const id = await pathId('B-HOTEL')
    const [v1] = await db
      .select({ id: pathVersions.id })
      .from(pathVersions)
      .where(and(eq(pathVersions.pathId, id), eq(pathVersions.version, 1)))
    const before = await db
      .select({ n: count() })
      .from(enrolments)
      .where(eq(enrolments.pathVersionId, v1?.id ?? ''))
    const completedUnitsBefore = await db
      .select({ n: count() })
      .from(unitProgress)
      .where(eq(unitProgress.status, 'completed'))

    await as(`/${id}/draft`, send('POST'))
    const detail = await as<{
      versions: { status: string; items: Record<string, unknown>[] }[]
    }>(`/${id}`)
    const draft = detail.versions.find((v) => v.status === 'draft')
    expect(draft?.items.length).toBe(7)
    const items = (draft?.items ?? []).map((item) => ({
      kind: item.kind,
      courseId: item.courseId,
      scenarioKey: item.scenarioKey,
      title: item.title,
      required: item.title === 'Understanding visitor needs' ? false : item.required,
      level: item.level,
      stage: item.stage,
      note: item.note,
    }))
    // Reorder: move the post-assessment before the practice, and make C02 optional.
    const post = items.pop()
    items.splice(5, 0, post as (typeof items)[number])
    await as(`/${id}/draft`, send('PATCH', { items }))

    const published = await as<{ version: number; previousVersion: number; migrated: number }>(
      `/${id}/publish`,
      send('POST', { changeNote: 'Understanding visitor needs is now optional' }),
    )
    expect(published).toMatchObject({ version: 2, previousVersion: 1, migrated: 0 })

    const after = await db
      .select({ n: count() })
      .from(enrolments)
      .where(eq(enrolments.pathVersionId, v1?.id ?? ''))
    expect(after[0]?.n).toBe(before[0]?.n ?? -1)
    const completedUnitsAfter = await db
      .select({ n: count() })
      .from(unitProgress)
      .where(eq(unitProgress.status, 'completed'))
    expect(completedUnitsAfter[0]?.n).toBe(completedUnitsBefore[0]?.n ?? -1)

    const [path] = await db.select().from(learningPaths).where(eq(learningPaths.id, id))
    const versions = await db.select().from(pathVersions).where(eq(pathVersions.pathId, id))
    expect(versions.find((v) => v.version === 1)?.status).toBe('archived')
    expect(versions.find((v) => v.version === 2)?.id).toBe(path?.currentVersionId ?? '')
    const [event] = await db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.action, 'path.publish'))
    expect(event?.reason).toContain('optional')
  })

  test('a deliberate migration moves open enrolments only, never completed ones', async () => {
    const id = await pathId('B-HOTEL')
    await as(`/${id}/draft`, send('POST'))
    const res = await as<{ migrated: number }>(
      `/${id}/publish`,
      send('POST', {
        changeNote: 'Version 3 for migration test',
        migrateOpen: true,
        migrationReason: 'Move open learners to the improved sequence',
      }),
    )
    expect(res.migrated).toBeGreaterThan(0)
    const [v2] = await db
      .select({ id: pathVersions.id })
      .from(pathVersions)
      .where(and(eq(pathVersions.pathId, id), eq(pathVersions.version, 2)))
    const stillOnV2 = await db
      .select({ status: enrolments.status })
      .from(enrolments)
      .where(eq(enrolments.pathVersionId, v2?.id ?? ''))
    expect(stillOnV2.every((e) => e.status !== 'not_started' && e.status !== 'in_progress')).toBe(
      true,
    )
  })

  test('a migration without a reason is rejected', async () => {
    stubSession('admin')
    const res = await app.request(
      `/api/admin/paths/${await pathId('B-GENERAL')}/publish`,
      send('POST', { changeNote: 'No reason given', migrateOpen: true }),
    )
    expect(res.status).toBe(400)
  })
})

describe('new path variant and learner preview', () => {
  test('copying a path creates a draft v1 with the same items, previewed for Maha', async () => {
    const created = await as<{ id: string; code: string }>(
      '',
      send('POST', {
        programme: 'B',
        name: 'B Hotel guest services (evening shift)',
        description: 'Variant for evening front office teams.',
        copyFromPathId: await pathId('B-HOTEL'),
      }),
      201,
    )
    expect(created.code).toMatch(/^B-VAR-\d{2}$/)
    const preview = await as<{
      learner: { fullName: string }
      version: { status: string; version: number }
      items: { state: string }[]
    }>(`/${created.id}/experience?learnerCode=L0001`)
    expect(preview.learner.fullName).toBe('Maha Al Nouri')
    expect(preview.version).toMatchObject({ status: 'draft', version: 1 })
    expect(preview.items.some((item) => item.state === 'completed')).toBe(true)
  })
})

describe('manual override', () => {
  test('requires a reason', async () => {
    stubSession('admin')
    const [e] = await db
      .select({ id: enrolments.id })
      .from(enrolments)
      .where(eq(enrolments.learnerId, 'user-l0001'))
    const res = await app.request(
      '/api/admin/paths/override',
      send('POST', { enrolmentId: e?.id, pathId: await pathId('B-GENERAL'), reason: '' }),
    )
    expect(res.status).toBe(400)
  })

  test('changes the path, records the reason and audits before/after', async () => {
    const [e] = await db
      .select({ id: enrolments.id })
      .from(enrolments)
      .where(eq(enrolments.learnerId, 'user-l0001'))
    await as(
      '/override',
      send('POST', {
        enrolmentId: e?.id,
        pathId: await pathId('B-GENERAL'),
        reason: 'Learner asked for the general route during the demo',
      }),
    )
    const [after] = await db
      .select()
      .from(enrolments)
      .where(eq(enrolments.id, e?.id ?? ''))
    expect(after?.overrideReason).toContain('general route')
    expect(after?.overriddenBy).toBe('user-admin')
    const [event] = await db
      .select()
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.action, 'enrolment.path_override'),
          eq(auditEvents.objectId, e?.id ?? ''),
        ),
      )
    expect(event?.after).toMatchObject({ path: 'B-GENERAL' })
    expect(event?.reason).toContain('general route')
  })
})

describe('access', () => {
  for (const role of ['learner', 'trainer'] as const) {
    test(`${role} gets 403`, async () => {
      stubSession(role)
      expect((await app.request('/api/admin/paths')).status).toBe(403)
      expect(
        (await app.request('/api/admin/paths/preview', send('POST', { programme: 'B' }))).status,
      ).toBe(403)
    })
  }
})
