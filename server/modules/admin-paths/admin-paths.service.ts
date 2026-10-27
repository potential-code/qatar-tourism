import { db } from '@server/db/connection'
import {
  assignmentRules,
  courses,
  enrolments,
  learningPaths,
  pathItems,
  pathVersions,
  programmes,
  user,
} from '@server/db/schema'
import { now } from '@server/lib/clock'
import { HttpError } from '@server/lib/errors'
import type { Viewer } from '@server/middleware/auth.middleware'
import type { ProgrammeCode } from '@shared/constants'
import type { CreatePathInput, DraftItemsInput, PublishInput } from '@shared/schemas/admin-paths'
import { and, asc, count, desc, eq, inArray, ne, sql } from 'drizzle-orm'
import { recordAudit } from '../audit/audit.service'
import { itemSignature } from './admin-paths.rules'

/**
 * Learning paths, versions and items (brief §14). Published versions are immutable: edits go
 * to a draft, publishing makes the draft current and archives the previous version, and
 * enrolments keep the version they were assigned unless an admin deliberately migrates them.
 */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

export type ItemView = {
  id: string
  position: number
  kind: (typeof pathItems.$inferSelect)['kind']
  courseId: string | null
  courseCode: string | null
  scenarioKey: string | null
  title: string
  required: boolean
  level: number
  stage: string
  note: string | null
}

async function itemsOf(versionIds: string[]): Promise<Map<string, ItemView[]>> {
  const out = new Map<string, ItemView[]>()
  if (versionIds.length === 0) return out
  const rows = await db
    .select({
      id: pathItems.id,
      versionId: pathItems.pathVersionId,
      position: pathItems.position,
      kind: pathItems.kind,
      courseId: pathItems.courseId,
      courseCode: courses.code,
      scenarioKey: pathItems.scenarioKey,
      title: pathItems.title,
      required: pathItems.required,
      level: pathItems.level,
      stage: pathItems.stage,
      note: pathItems.note,
    })
    .from(pathItems)
    .leftJoin(courses, eq(courses.id, pathItems.courseId))
    .where(inArray(pathItems.pathVersionId, versionIds))
    .orderBy(asc(pathItems.position))
  for (const { versionId, ...row } of rows) {
    const list = out.get(versionId) ?? []
    list.push(row)
    out.set(versionId, list)
  }
  return out
}

/** Enrolment counts per path version, split by status (the publish impact panel). */
async function enrolmentCounts(pathIds: string[]) {
  if (pathIds.length === 0) return []
  return db
    .select({
      pathId: enrolments.pathId,
      versionId: enrolments.pathVersionId,
      status: enrolments.status,
      n: count(),
    })
    .from(enrolments)
    .where(inArray(enrolments.pathId, pathIds))
    .groupBy(enrolments.pathId, enrolments.pathVersionId, enrolments.status)
}

export async function listPaths() {
  const [paths, versions, counts, rules, progs] = await Promise.all([
    db
      .select({
        id: learningPaths.id,
        code: learningPaths.code,
        name: learningPaths.name,
        description: learningPaths.description,
        isDefault: learningPaths.isDefault,
        currentVersionId: learningPaths.currentVersionId,
        programme: programmes.code,
        updatedAt: learningPaths.updatedAt,
      })
      .from(learningPaths)
      .innerJoin(programmes, eq(programmes.id, learningPaths.programmeId))
      .orderBy(asc(programmes.code), desc(learningPaths.isDefault), asc(learningPaths.name)),
    db
      .select({
        id: pathVersions.id,
        pathId: pathVersions.pathId,
        version: pathVersions.version,
        status: pathVersions.status,
        publishedAt: pathVersions.publishedAt,
        items: count(pathItems.id),
      })
      .from(pathVersions)
      .leftJoin(pathItems, eq(pathItems.pathVersionId, pathVersions.id))
      .groupBy(pathVersions.id),
    db
      .select({ pathId: enrolments.pathId, status: enrolments.status, n: count() })
      .from(enrolments)
      .groupBy(enrolments.pathId, enrolments.status),
    listRules(),
    db
      .select({ code: programmes.code, title: programmes.title })
      .from(programmes)
      .orderBy(programmes.code),
  ])
  return {
    programmes: progs,
    rules,
    paths: paths.map((path) => {
      const mine = versions.filter((v) => v.pathId === path.id)
      const current = mine.find((v) => v.id === path.currentVersionId) ?? null
      const draft = mine.find((v) => v.status === 'draft') ?? null
      const own = counts.filter((c) => c.pathId === path.id)
      return {
        ...path,
        current: current && {
          id: current.id,
          version: current.version,
          publishedAt: current.publishedAt?.toISOString() ?? null,
          items: current.items,
        },
        draft: draft && { id: draft.id, version: draft.version, items: draft.items },
        versionCount: mine.length,
        enrolments: own.reduce((sum, c) => sum + c.n, 0),
        completed: own.filter((c) => c.status === 'completed').reduce((s, c) => s + c.n, 0),
        rules: rules.filter((rule) => rule.pathId === path.id).length,
        updatedAt: path.updatedAt.toISOString(),
      }
    }),
  }
}

export async function listRules() {
  const rows = await db
    .select({
      id: assignmentRules.id,
      code: assignmentRules.code,
      name: assignmentRules.name,
      summary: assignmentRules.summary,
      programme: programmes.code,
      pathId: assignmentRules.pathId,
      pathName: learningPaths.name,
      pathCode: learningPaths.code,
      priority: assignmentRules.priority,
      isDefault: assignmentRules.isDefault,
      status: assignmentRules.status,
      conditions: assignmentRules.conditions,
      updatedAt: assignmentRules.updatedAt,
    })
    .from(assignmentRules)
    .innerJoin(programmes, eq(programmes.id, assignmentRules.programmeId))
    .innerJoin(learningPaths, eq(learningPaths.id, assignmentRules.pathId))
    .orderBy(asc(programmes.code), desc(assignmentRules.priority), asc(assignmentRules.name))
  return rows.map((row) => ({ ...row, updatedAt: row.updatedAt.toISOString() }))
}

export async function catalogue() {
  return db
    .select({ id: courses.id, code: courses.code, title: courses.title, format: courses.format })
    .from(courses)
    .where(eq(courses.isActive, true))
    .orderBy(courses.code)
}

async function getPathRow(pathId: string) {
  const [row] = await db
    .select({
      id: learningPaths.id,
      code: learningPaths.code,
      name: learningPaths.name,
      description: learningPaths.description,
      isDefault: learningPaths.isDefault,
      currentVersionId: learningPaths.currentVersionId,
      programmeId: learningPaths.programmeId,
      programme: programmes.code,
      programmeTitle: programmes.title,
    })
    .from(learningPaths)
    .innerJoin(programmes, eq(programmes.id, learningPaths.programmeId))
    .where(eq(learningPaths.id, pathId))
    .limit(1)
  if (!row) throw HttpError.notFound('Learning path not found')
  return row
}

export async function getPath(pathId: string) {
  const path = await getPathRow(pathId)
  const versions = await db
    .select({
      id: pathVersions.id,
      version: pathVersions.version,
      status: pathVersions.status,
      changeNote: pathVersions.changeNote,
      publishedAt: pathVersions.publishedAt,
      publishedBy: user.name,
      updatedAt: pathVersions.updatedAt,
    })
    .from(pathVersions)
    .leftJoin(user, eq(user.id, pathVersions.publishedBy))
    .where(eq(pathVersions.pathId, pathId))
    .orderBy(desc(pathVersions.version))
  const [items, counts] = await Promise.all([
    itemsOf(versions.map((v) => v.id)),
    enrolmentCounts([pathId]),
  ])
  const statusCounts = (versionId: string) => {
    const mine = counts.filter((c) => c.versionId === versionId)
    const of = (s: string) => mine.filter((c) => c.status === s).reduce((sum, c) => sum + c.n, 0)
    return {
      total: mine.reduce((sum, c) => sum + c.n, 0),
      notStarted: of('not_started'),
      inProgress: of('in_progress'),
      awaitingReview: of('awaiting_review'),
      completed: of('completed'),
    }
  }
  return {
    path: { ...path, programmeId: undefined },
    versions: versions.map((v) => ({
      ...v,
      publishedAt: v.publishedAt?.toISOString() ?? null,
      updatedAt: v.updatedAt.toISOString(),
      isCurrent: v.id === path.currentVersionId,
      items: items.get(v.id) ?? [],
      enrolments: statusCounts(v.id),
    })),
  }
}

async function insertItems(
  tx: Tx,
  versionId: string,
  items: Omit<ItemView, 'id' | 'courseCode' | 'position'>[],
) {
  if (items.length === 0) return
  const at = now()
  await tx.insert(pathItems).values(
    items.map((item, index) => ({
      pathVersionId: versionId,
      position: index + 1,
      kind: item.kind,
      courseId: item.courseId ?? null,
      scenarioKey: item.scenarioKey ?? null,
      title: item.title,
      required: item.required,
      level: item.level,
      stage: item.stage,
      note: item.note ?? null,
      createdAt: at,
      updatedAt: at,
    })),
  )
}

async function nextPathCode(tx: Tx, programme: ProgrammeCode) {
  const rows = await tx
    .select({ code: learningPaths.code })
    .from(learningPaths)
    .where(sql`${learningPaths.code} like ${`${programme}-VAR-%`}`)
  const used = new Set(rows.map((r) => r.code))
  let n = 1
  while (used.has(`${programme}-VAR-${String(n).padStart(2, '0')}`)) n++
  return `${programme}-VAR-${String(n).padStart(2, '0')}`
}

/** A new path (variant) with draft v1, optionally copying another path's items. */
export async function createPath(viewer: Viewer, input: CreatePathInput, requestId?: string) {
  const [programme] = await db
    .select({ id: programmes.id })
    .from(programmes)
    .where(eq(programmes.code, input.programme))
    .limit(1)
  if (!programme) throw HttpError.notFound('Programme not found')

  let sourceItems: ItemView[] = []
  let sourceCode: string | null = null
  if (input.copyFromPathId) {
    const source = await getPath(input.copyFromPathId)
    if (source.path.programme !== input.programme)
      throw HttpError.badRequest('A path can only be copied within the same programme')
    const version = source.versions.find((v) => v.isCurrent) ?? source.versions[0] ?? null
    sourceItems = version?.items ?? []
    sourceCode = source.path.code
  }

  return db.transaction(async (tx) => {
    const code = await nextPathCode(tx, input.programme)
    const at = now()
    const [path] = await tx
      .insert(learningPaths)
      .values({
        code,
        programmeId: programme.id,
        name: input.name,
        description: input.description,
        isDefault: false,
        createdAt: at,
        updatedAt: at,
      })
      .returning({ id: learningPaths.id })
    if (!path) throw new Error('Path insert returned nothing')
    const [version] = await tx
      .insert(pathVersions)
      .values({
        pathId: path.id,
        version: 1,
        status: 'draft',
        changeNote: sourceCode ? `Copied from ${sourceCode}` : 'New path',
        createdAt: at,
        updatedAt: at,
      })
      .returning({ id: pathVersions.id })
    if (!version) throw new Error('Version insert returned nothing')
    await insertItems(tx, version.id, sourceItems)
    await recordAudit(
      viewer,
      {
        action: 'path.create',
        objectType: 'learning_path',
        objectId: code,
        after: {
          name: input.name,
          programme: input.programme,
          copiedFrom: sourceCode,
          items: sourceItems.length,
        },
      },
      tx,
      requestId,
    )
    return { id: path.id, code }
  })
}

export async function updatePath(
  viewer: Viewer,
  pathId: string,
  input: { name?: string; description?: string; isDefault?: true },
  requestId?: string,
) {
  const path = await getPathRow(pathId)
  return db.transaction(async (tx) => {
    const at = now()
    if (input.isDefault && !path.currentVersionId)
      throw HttpError.badRequest('Publish this path before making it the default')
    if (input.isDefault) {
      await tx
        .update(learningPaths)
        .set({ isDefault: false, updatedAt: at })
        .where(and(eq(learningPaths.programmeId, path.programmeId), ne(learningPaths.id, pathId)))
      // The programme default rule follows the default path.
      await tx
        .update(assignmentRules)
        .set({ pathId, updatedAt: at })
        .where(
          and(
            eq(assignmentRules.programmeId, path.programmeId),
            eq(assignmentRules.isDefault, true),
          ),
        )
    }
    await tx
      .update(learningPaths)
      .set({
        ...(input.name ? { name: input.name } : {}),
        ...(input.description ? { description: input.description } : {}),
        ...(input.isDefault ? { isDefault: true } : {}),
        updatedAt: at,
      })
      .where(eq(learningPaths.id, pathId))
    await recordAudit(
      viewer,
      {
        action: input.isDefault ? 'path.set_default' : 'path.update',
        objectType: 'learning_path',
        objectId: path.code,
        before: { name: path.name, description: path.description, isDefault: path.isDefault },
        after: {
          name: input.name ?? path.name,
          description: input.description ?? path.description,
          isDefault: input.isDefault ?? path.isDefault,
        },
      },
      tx,
      requestId,
    )
    return { id: pathId }
  })
}

/** Returns the draft version, creating it from the current published version if needed. */
export async function ensureDraft(viewer: Viewer, pathId: string, requestId?: string) {
  const detail = await getPath(pathId)
  const existing = detail.versions.find((v) => v.status === 'draft')
  if (existing) return { id: existing.id, version: existing.version, created: false }
  const base = detail.versions.find((v) => v.isCurrent) ?? detail.versions[0]
  const nextVersion = Math.max(0, ...detail.versions.map((v) => v.version)) + 1
  return db.transaction(async (tx) => {
    const at = now()
    const [version] = await tx
      .insert(pathVersions)
      .values({
        pathId,
        version: nextVersion,
        status: 'draft',
        changeNote: base ? `Draft from v${base.version}` : 'New draft',
        createdAt: at,
        updatedAt: at,
      })
      .returning({ id: pathVersions.id })
    if (!version) throw new Error('Draft insert returned nothing')
    await insertItems(tx, version.id, base?.items ?? [])
    await recordAudit(
      viewer,
      {
        action: 'path.draft_create',
        objectType: 'learning_path',
        objectId: detail.path.code,
        after: { version: nextVersion, basedOn: base?.version ?? null },
      },
      tx,
      requestId,
    )
    return { id: version.id, version: nextVersion, created: true }
  })
}

/** Replaces the draft's items in order. Positions are rewritten 1…n inside one transaction. */
export async function saveDraft(
  viewer: Viewer,
  pathId: string,
  input: DraftItemsInput,
  requestId?: string,
) {
  const detail = await getPath(pathId)
  const draft = detail.versions.find((v) => v.status === 'draft')
  if (!draft) throw HttpError.badRequest('There is no draft to edit. Start a draft first.')

  const courseIds = input.items.map((i) => i.courseId).filter((id): id is string => Boolean(id))
  if (courseIds.length) {
    const found = await db
      .select({ id: courses.id })
      .from(courses)
      .where(inArray(courses.id, courseIds))
    if (found.length !== new Set(courseIds).size)
      throw HttpError.badRequest('Unknown course in the path')
  }
  for (const item of input.items) {
    if ((item.kind === 'course' || item.kind === 'session') && !item.courseId)
      throw HttpError.badRequest(`"${item.title}" needs a course`)
  }

  return db.transaction(async (tx) => {
    await tx.delete(pathItems).where(eq(pathItems.pathVersionId, draft.id))
    await insertItems(
      tx,
      draft.id,
      input.items.map((item) => ({
        kind: item.kind,
        courseId: item.courseId ?? null,
        scenarioKey: item.scenarioKey ?? null,
        title: item.title,
        required: item.required,
        level: item.level,
        stage: item.stage,
        note: item.note ?? null,
      })),
    )
    await tx
      .update(pathVersions)
      .set({ ...(input.changeNote ? { changeNote: input.changeNote } : {}), updatedAt: now() })
      .where(eq(pathVersions.id, draft.id))
    await recordAudit(
      viewer,
      {
        action: 'path.draft_update',
        objectType: 'learning_path',
        objectId: detail.path.code,
        before: { version: draft.version, items: draft.items.map(itemSignature) },
        after: { version: draft.version, items: input.items.map(itemSignature) },
      },
      tx,
      requestId,
    )
    return { versionId: draft.id, items: input.items.length }
  })
}

export async function discardDraft(viewer: Viewer, pathId: string, requestId?: string) {
  const detail = await getPath(pathId)
  const draft = detail.versions.find((v) => v.status === 'draft')
  if (!draft) throw HttpError.badRequest('There is no draft to discard')
  if (!detail.path.currentVersionId)
    throw HttpError.badRequest('A path with no published version keeps its first draft')
  return db.transaction(async (tx) => {
    await tx.delete(pathVersions).where(eq(pathVersions.id, draft.id))
    await recordAudit(
      viewer,
      {
        action: 'path.draft_discard',
        objectType: 'learning_path',
        objectId: detail.path.code,
        before: { version: draft.version, items: draft.items.length },
      },
      tx,
      requestId,
    )
    return { discarded: draft.version }
  })
}

/** Publishes the draft (brief §14 versioning). Optionally migrates open enrolments. */
export async function publish(
  viewer: Viewer,
  pathId: string,
  input: PublishInput,
  requestId?: string,
) {
  const detail = await getPath(pathId)
  const draft = detail.versions.find((v) => v.status === 'draft')
  if (!draft) throw HttpError.badRequest('There is no draft to publish')
  if (draft.items.length === 0) throw HttpError.badRequest('A path needs at least one item')
  const previous = detail.versions.find((v) => v.isCurrent) ?? null

  return db.transaction(async (tx) => {
    const at = now()
    if (previous) {
      await tx
        .update(pathVersions)
        .set({ status: 'archived', updatedAt: at })
        .where(eq(pathVersions.id, previous.id))
    }
    await tx
      .update(pathVersions)
      .set({
        status: 'published',
        changeNote: input.changeNote,
        publishedAt: at,
        publishedBy: viewer.id,
        updatedAt: at,
      })
      .where(eq(pathVersions.id, draft.id))
    await tx
      .update(learningPaths)
      .set({ currentVersionId: draft.id, updatedAt: at })
      .where(eq(learningPaths.id, pathId))
    await recordAudit(
      viewer,
      {
        action: 'path.publish',
        objectType: 'learning_path',
        objectId: detail.path.code,
        before: previous
          ? { version: previous.version, items: previous.items.map(itemSignature) }
          : null,
        after: { version: draft.version, items: draft.items.map(itemSignature) },
        reason: input.changeNote,
      },
      tx,
      requestId,
    )

    let migrated = 0
    if (input.migrateOpen && previous) {
      // Completed and awaiting-review enrolments are never moved: their records stay on the
      // version they finished. Unit progress is keyed by course, so equivalents carry over.
      const moved = await tx
        .update(enrolments)
        .set({ pathVersionId: draft.id, updatedAt: at })
        .where(
          and(
            eq(enrolments.pathId, pathId),
            ne(enrolments.pathVersionId, draft.id),
            inArray(enrolments.status, ['not_started', 'in_progress']),
          ),
        )
        .returning({ id: enrolments.id })
      migrated = moved.length
      await recordAudit(
        viewer,
        {
          action: 'path.migrate',
          objectType: 'learning_path',
          objectId: detail.path.code,
          before: { version: previous.version },
          after: { version: draft.version, enrolments: migrated },
          reason: input.migrationReason ?? null,
        },
        tx,
        requestId,
      )
    }
    return {
      version: draft.version,
      previousVersion: previous?.version ?? null,
      migrated,
      retained:
        detail.versions.reduce((sum, v) => sum + (v.id === draft.id ? 0 : v.enrolments.total), 0) -
        migrated,
    }
  })
}

export { getPathRow }
