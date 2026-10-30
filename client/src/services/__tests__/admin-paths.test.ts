import { beforeEach, describe, expect, test } from 'bun:test'
import type { PreviewRule } from '@shared/schemas/admin-paths'
import type { DemoDb } from '@/mocks/db'
import { createRule, getExperience, overridePath, previewMatch } from '../admin/path-rules.service'
import {
  createPath,
  getPath,
  listPaths,
  publishPath,
  saveDraft,
  startDraft,
} from '../admin/paths.service'
import { actAs, freshDemo } from './helpers'

let db: DemoDb

beforeEach(() => {
  db = freshDemo()
  actAs(db, 'user-admin')
})

const pathId = (code: string) => {
  const path = db.learningPaths.find((p) => p.code === code)
  if (!path) throw new Error(`no path ${code}`)
  return path.id
}

function savedRulesOfB(): PreviewRule[] {
  const b = db.programmes.find((p) => p.code === 'B')?.id
  return db.assignmentRules
    .filter((r) => r.programmeId === b)
    .map((r) => ({
      id: r.id,
      name: r.name,
      programme: 'B' as const,
      pathId: r.pathId,
      priority: r.priority,
      isDefault: r.isDefault,
      conditions: structuredClone(r.conditions) as PreviewRule['conditions'],
      summary: r.summary,
      status: r.status,
    }))
}

describe('rule priority resolution (brief §14)', () => {
  test("Maha's saved rules resolve to B Hotel guest services at priority 20", async () => {
    const body = await previewMatch({ programme: 'B', learnerCode: 'L0001' })
    expect(body.learner.fullName).toBe('Maha Al Nouri')
    expect(body.resolution).toMatchObject({ pathCode: 'B-HOTEL', priority: 20, usedDefault: false })
    expect(body.profile.organisationType).toBe('hotel_accommodation')
    expect(body.evaluations.filter((e) => e.winner)).toHaveLength(1)
  })

  test('a lower-priority rule that also matches does not win', async () => {
    const rules = savedRulesOfB()
    rules.push({
      name: 'Guest services to transport (test)',
      programme: 'B',
      pathId: pathId('B-TRANSPORT'),
      priority: 10,
      isDefault: false,
      conditions: {
        op: 'AND',
        conditions: [{ field: 'jobFunction', operator: 'eq', value: 'guest_services' }],
      },
      summary: 'Crafted overlap',
      status: 'published',
    })
    const body = await previewMatch({ programme: 'B', learnerCode: 'L0001', rules })
    expect(body.resolution.pathCode).toBe('B-HOTEL')
    expect(
      body.evaluations.filter((e) => e.result.pass && !e.name.includes('General')).length,
    ).toBe(2)
  })

  test('a new, higher-priority rule wins once saved, and is audited', async () => {
    await createRule({
      name: 'Complaint handlers practise directions',
      programme: 'B',
      pathId: pathId('B-TRANSPORT'),
      priority: 50,
      conditions: {
        op: 'OR',
        conditions: [{ field: 'goals', operator: 'includes_any', value: ['complaint_handling'] }],
      },
      summary: 'Goals include complaint handling',
      status: 'published',
    })
    const body = await previewMatch({ programme: 'B', learnerCode: 'L0001' })
    expect(body.resolution).toMatchObject({ pathCode: 'B-TRANSPORT', priority: 50 })
    const event = db.auditEvents.find((e) => e.action === 'rule.create')
    expect(event?.actorId).toBe('user-admin')
  })

  test('an incomplete (draft) profile always gets the default path', async () => {
    const draft = db.profiles.find((p) => p.status === 'draft')
    const body = await previewMatch({ programme: 'B', learnerCode: draft?.learnerCode ?? 'L9999' })
    expect(body.resolution).toMatchObject({ pathCode: 'B-GENERAL', usedDefault: true })
    expect(body.resolution.reason).toContain('profile incomplete')
  })

  test('a non-default rule with no conditions is rejected', async () => {
    await expect(
      createRule({
        name: 'Empty',
        programme: 'B',
        pathId: pathId('B-HOTEL'),
        priority: 5,
        conditions: { op: 'AND', conditions: [] },
        summary: 'Empty rule',
      }),
    ).rejects.toMatchObject({ status: 400 })
  })
})

describe('versioning keeps existing learners and completion records', () => {
  async function publishV2() {
    const id = pathId('B-HOTEL')
    await startDraft(id)
    const draft = (await getPath(id)).versions.find((v) => v.status === 'draft')
    // Six required items plus the two optional Content Library units (C08, C09).
    expect(draft?.items.length).toBe(9)
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
    if (post) items.splice(5, 0, post)
    await saveDraft(id, { items })
    return publishPath(id, { changeNote: 'Understanding visitor needs is now optional' })
  }

  test('publish v2: enrolments stay on v1, completed progress untouched, v1 archived', async () => {
    const id = pathId('B-HOTEL')
    const v1 = db.pathVersions.find((v) => v.pathId === id && v.version === 1)
    const onV1 = db.enrolments.filter((e) => e.pathVersionId === v1?.id).length
    const completedUnits = db.unitProgress.filter((u) => u.status === 'completed').length

    expect(await publishV2()).toMatchObject({ version: 2, previousVersion: 1, migrated: 0 })
    expect(db.enrolments.filter((e) => e.pathVersionId === v1?.id).length).toBe(onV1)
    expect(db.unitProgress.filter((u) => u.status === 'completed').length).toBe(completedUnits)
    const versions = db.pathVersions.filter((v) => v.pathId === id)
    expect(versions.find((v) => v.version === 1)?.status).toBe('archived')
    expect(versions.find((v) => v.version === 2)?.id).toBe(
      db.learningPaths.find((p) => p.id === id)?.currentVersionId ?? '',
    )
    expect(db.auditEvents.find((e) => e.action === 'path.publish')?.reason).toContain('optional')
    const list = await listPaths()
    expect(list.paths.find((p) => p.id === id)?.current?.version).toBe(2)
  })

  test('a deliberate migration moves open enrolments only, never completed ones', async () => {
    await publishV2()
    const id = pathId('B-HOTEL')
    await startDraft(id)
    const res = await publishPath(id, {
      changeNote: 'Version 3 for migration test',
      migrateOpen: true,
      migrationReason: 'Move open learners to the improved sequence',
    })
    expect(res.migrated).toBeGreaterThan(0)
    const v1 = db.pathVersions.find((v) => v.pathId === id && v.version === 1)
    const stillOnV1 = db.enrolments.filter((e) => e.pathVersionId === v1?.id)
    expect(stillOnV1.length).toBeGreaterThan(0)
    expect(stillOnV1.every((e) => e.status !== 'not_started' && e.status !== 'in_progress')).toBe(
      true,
    )
    expect(db.auditEvents.some((e) => e.action === 'path.migrate')).toBe(true)
  })

  test('a migration without a reason is rejected before anything changes', async () => {
    const id = pathId('B-GENERAL')
    await startDraft(id)
    const before = structuredClone(db.pathVersions)
    await expect(
      publishPath(id, { changeNote: 'No reason given', migrateOpen: true }),
    ).rejects.toMatchObject({ status: 400 })
    expect(db.pathVersions).toEqual(before)
  })
})

describe('new path variant and learner preview', () => {
  test('copying a path creates a draft v1 with the same items, previewed for Maha', async () => {
    const created = await createPath({
      programme: 'B',
      name: 'B Hotel guest services (evening shift)',
      description: 'Variant for evening front office teams.',
      copyFromPathId: pathId('B-HOTEL'),
    })
    expect(created.code).toMatch(/^B-VAR-\d{2}$/)
    const preview = await getExperience(created.id, { learnerCode: 'L0001' })
    expect(preview.learner.fullName).toBe('Maha Al Nouri')
    expect(preview.version).toMatchObject({ status: 'draft', version: 1 })
    expect(preview.items.some((item) => item.state === 'completed')).toBe(true)
  })
})

describe('manual override', () => {
  const mahaB = () => {
    const b = db.programmes.find((p) => p.code === 'B')?.id
    const enrolment = db.enrolments.find((e) => e.learnerId === 'user-l0001' && e.programmeId === b)
    if (!enrolment) throw new Error('no B enrolment for Maha')
    return enrolment
  }

  test('requires a reason', async () => {
    await expect(
      overridePath({ enrolmentId: mahaB().id, pathId: pathId('B-GENERAL'), reason: '' }),
    ).rejects.toMatchObject({ status: 400 })
  })

  test('changes the path, records the reason and audits before/after', async () => {
    const enrolment = mahaB()
    await overridePath({
      enrolmentId: enrolment.id,
      pathId: pathId('B-GENERAL'),
      reason: 'Learner asked for the general route during the demo',
    })
    expect(enrolment.overrideReason).toContain('general route')
    expect(enrolment.overriddenBy).toBe('user-admin')
    const event = db.auditEvents.find(
      (e) => e.action === 'enrolment.path_override' && e.objectId === enrolment.id,
    )
    expect(event?.after).toMatchObject({ path: 'B-GENERAL' })
    expect(event?.reason).toContain('general route')
  })
})

describe('access', () => {
  for (const id of ['user-l0001', 'user-t01']) {
    test(`${id} is refused`, async () => {
      actAs(db, id)
      await expect(listPaths()).rejects.toMatchObject({ status: 403 })
      await expect(previewMatch({ programme: 'B' })).rejects.toMatchObject({ status: 403 })
      await expect(startDraft(pathId('B-HOTEL'))).rejects.toMatchObject({ status: 403 })
    })
  }
})
