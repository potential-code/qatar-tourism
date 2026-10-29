import type { ProgrammeCode } from '@shared/constants'
import {
  type CreatePathInput,
  createPathInput,
  type DraftItemsInput,
  draftItemsInput,
  type PublishInput,
  pathIdParam,
  pathUpdateInput,
  publishInput,
} from '@shared/schemas/admin-paths'
import type { z } from 'zod'
import {
  ApiError,
  commit,
  db,
  delay,
  findOr404,
  indexBy,
  insertRow,
  nowIso,
  out,
  parseInput,
  requireRole,
  updateRow,
} from '../api'
import { audit } from '../audit.service'
import { type ItemView, listRuleRows, type NewItem, pathDetail, pathRow } from './paths/reads'
import { itemSignature } from './paths/rules'
import { removeWhere } from './rows'

/**
 * Learning paths, versions and items (brief §14), formerly /api/admin/paths. Admin only, every
 * change audited ('path.change': "Yes with audit trail"). Published versions are immutable: edits
 * go to a draft, publishing makes the draft current and archives the previous version, and
 * enrolments keep the version they were assigned unless an admin deliberately migrates them.
 */

/** Every path with its current version, draft, enrolment counts and rules; and the programmes. */
export async function listPaths() {
  await delay()
  requireRole('admin')
  const rules = listRuleRows()
  const itemCounts = new Map<string, number>()
  for (const item of db.pathItems)
    itemCounts.set(item.pathVersionId, (itemCounts.get(item.pathVersionId) ?? 0) + 1)
  const programmes = [...db.programmes].sort((a, b) => a.code.localeCompare(b.code))
  const codeOf = indexBy(programmes, (p) => p.id)

  const paths = db.learningPaths
    .map((path) => ({ path, programme: codeOf.get(path.programmeId)?.code ?? 'A' }))
    .sort(
      (a, b) =>
        a.programme.localeCompare(b.programme) ||
        Number(b.path.isDefault) - Number(a.path.isDefault) ||
        a.path.name.localeCompare(b.path.name),
    )
    .map(({ path, programme }) => {
      const mine = db.pathVersions.filter((v) => v.pathId === path.id)
      const current = mine.find((v) => v.id === path.currentVersionId) ?? null
      const draft = mine.find((v) => v.status === 'draft') ?? null
      const own = db.enrolments.filter((e) => e.pathId === path.id)
      return {
        id: path.id,
        code: path.code,
        name: path.name,
        description: path.description,
        isDefault: path.isDefault,
        currentVersionId: path.currentVersionId,
        programme,
        current: current && {
          id: current.id,
          version: current.version,
          publishedAt: current.publishedAt,
          items: itemCounts.get(current.id) ?? 0,
        },
        draft: draft && {
          id: draft.id,
          version: draft.version,
          items: itemCounts.get(draft.id) ?? 0,
        },
        versionCount: mine.length,
        enrolments: own.length,
        completed: own.filter((e) => e.status === 'completed').length,
        rules: rules.filter((rule) => rule.pathId === path.id).length,
        updatedAt: path.updatedAt,
      }
    })

  return out({
    programmes: programmes.map((p) => ({ code: p.code, title: p.title })),
    rules,
    paths,
  })
}

/** Active courses the builder can add. */
export async function listCatalogue() {
  await delay()
  requireRole('admin')
  return db.courses
    .filter((c) => c.isActive)
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((c) => ({ id: c.id, code: c.code, title: c.title, format: c.format }))
}

export async function getPath(pathId: string) {
  await delay()
  requireRole('admin')
  parseInput(pathIdParam, { pathId }, 'param')
  return out(pathDetail(pathId))
}

function insertItems(versionId: string, items: readonly NewItem[]) {
  items.forEach((item, index) => {
    insertRow('pathItems', {
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
    })
  })
}

function nextPathCode(programme: ProgrammeCode) {
  const used = new Set(db.learningPaths.map((p) => p.code))
  let n = 1
  while (used.has(`${programme}-VAR-${String(n).padStart(2, '0')}`)) n++
  return `${programme}-VAR-${String(n).padStart(2, '0')}`
}

/** A new path (variant) with draft v1, optionally copying another path's items. */
export async function createPath(input: CreatePathInput) {
  await delay()
  requireRole('admin')
  const data = parseInput(createPathInput, input)
  const programme = findOr404(
    db.programmes,
    (p) => p.code === data.programme,
    'Programme not found',
  )

  let sourceItems: ItemView[] = []
  let sourceCode: string | null = null
  if (data.copyFromPathId) {
    const source = pathDetail(data.copyFromPathId)
    if (source.path.programme !== data.programme)
      throw ApiError.badRequest('A path can only be copied within the same programme')
    const version = source.versions.find((v) => v.isCurrent) ?? source.versions[0] ?? null
    sourceItems = version?.items ?? []
    sourceCode = source.path.code
  }

  const code = nextPathCode(data.programme)
  const path = insertRow('learningPaths', {
    code,
    programmeId: programme.id,
    name: data.name,
    description: data.description,
    isDefault: false,
    currentVersionId: null,
  })
  const version = insertRow('pathVersions', {
    pathId: path.id,
    version: 1,
    status: 'draft',
    changeNote: sourceCode ? `Copied from ${sourceCode}` : 'New path',
    publishedAt: null,
    publishedBy: null,
  })
  insertItems(version.id, sourceItems)
  audit({
    action: 'path.create',
    objectType: 'learning_path',
    objectId: code,
    after: {
      name: data.name,
      programme: data.programme,
      copiedFrom: sourceCode,
      items: sourceItems.length,
    },
  })
  commit()
  return { id: path.id, code }
}

/** Renames a path or makes it the programme default (the default rule then points here). */
export async function updatePath(pathId: string, input: z.input<typeof pathUpdateInput>) {
  await delay()
  requireRole('admin')
  parseInput(pathIdParam, { pathId }, 'param')
  const data = parseInput(pathUpdateInput, input)
  const path = pathRow(pathId)
  if (data.isDefault && !path.currentVersionId)
    throw ApiError.badRequest('Publish this path before making it the default')

  if (data.isDefault) {
    for (const other of db.learningPaths) {
      if (other.programmeId === path.programmeId && other.id !== pathId)
        updateRow(other, { isDefault: false })
    }
    for (const rule of db.assignmentRules) {
      if (rule.programmeId === path.programmeId && rule.isDefault) updateRow(rule, { pathId })
    }
  }
  const live = findOr404(db.learningPaths, (p) => p.id === pathId, 'Learning path not found')
  updateRow(live, {
    ...(data.name ? { name: data.name } : {}),
    ...(data.description ? { description: data.description } : {}),
    ...(data.isDefault ? { isDefault: true } : {}),
  })
  audit({
    action: data.isDefault ? 'path.set_default' : 'path.update',
    objectType: 'learning_path',
    objectId: path.code,
    before: { name: path.name, description: path.description, isDefault: path.isDefault },
    after: {
      name: data.name ?? path.name,
      description: data.description ?? path.description,
      isDefault: data.isDefault ?? path.isDefault,
    },
  })
  commit()
  return { id: pathId }
}

/** Returns the draft version, creating it from the current published version if needed. */
export async function startDraft(pathId: string) {
  await delay()
  requireRole('admin')
  parseInput(pathIdParam, { pathId }, 'param')
  const detail = pathDetail(pathId)
  const existing = detail.versions.find((v) => v.status === 'draft')
  if (existing) return { id: existing.id, version: existing.version, created: false }
  const base = detail.versions.find((v) => v.isCurrent) ?? detail.versions[0]
  const nextVersion = Math.max(0, ...detail.versions.map((v) => v.version)) + 1
  const version = insertRow('pathVersions', {
    pathId,
    version: nextVersion,
    status: 'draft',
    changeNote: base ? `Draft from v${base.version}` : 'New draft',
    publishedAt: null,
    publishedBy: null,
  })
  insertItems(version.id, base?.items ?? [])
  audit({
    action: 'path.draft_create',
    objectType: 'learning_path',
    objectId: detail.path.code,
    after: { version: nextVersion, basedOn: base?.version ?? null },
  })
  commit()
  return { id: version.id, version: nextVersion, created: true }
}

/** Replaces the draft's items in order. Positions are rewritten 1…n. */
export async function saveDraft(pathId: string, input: DraftItemsInput) {
  await delay()
  requireRole('admin')
  parseInput(pathIdParam, { pathId }, 'param')
  const data = parseInput(draftItemsInput, input)
  const detail = pathDetail(pathId)
  const draft = detail.versions.find((v) => v.status === 'draft')
  if (!draft) throw ApiError.badRequest('There is no draft to edit. Start a draft first.')

  const courseIds = new Set(data.items.map((i) => i.courseId).filter((id): id is string => !!id))
  const known = new Set(db.courses.map((c) => c.id))
  if ([...courseIds].some((id) => !known.has(id)))
    throw ApiError.badRequest('Unknown course in the path')
  for (const item of data.items) {
    if ((item.kind === 'course' || item.kind === 'session') && !item.courseId)
      throw ApiError.badRequest(`"${item.title}" needs a course`)
  }

  removeWhere(db.pathItems, (i) => i.pathVersionId === draft.id)
  insertItems(
    draft.id,
    data.items.map((item) => ({
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
  const version = findOr404(db.pathVersions, (v) => v.id === draft.id, 'Draft not found')
  updateRow(version, data.changeNote ? { changeNote: data.changeNote } : {})
  audit({
    action: 'path.draft_update',
    objectType: 'learning_path',
    objectId: detail.path.code,
    before: { version: draft.version, items: draft.items.map(itemSignature) },
    after: { version: draft.version, items: data.items.map(itemSignature) },
  })
  commit()
  return { versionId: draft.id, items: data.items.length }
}

export async function discardDraft(pathId: string) {
  await delay()
  requireRole('admin')
  parseInput(pathIdParam, { pathId }, 'param')
  const detail = pathDetail(pathId)
  const draft = detail.versions.find((v) => v.status === 'draft')
  if (!draft) throw ApiError.badRequest('There is no draft to discard')
  if (!detail.path.currentVersionId)
    throw ApiError.badRequest('A path with no published version keeps its first draft')
  removeWhere(db.pathItems, (i) => i.pathVersionId === draft.id)
  removeWhere(db.pathVersions, (v) => v.id === draft.id)
  audit({
    action: 'path.draft_discard',
    objectType: 'learning_path',
    objectId: detail.path.code,
    before: { version: draft.version, items: draft.items.length },
  })
  commit()
  return { discarded: draft.version }
}

/** Publishes the draft (brief §14 versioning). Optionally migrates open enrolments. */
export async function publishPath(pathId: string, input: z.input<typeof publishInput>) {
  await delay()
  const viewer = requireRole('admin')
  parseInput(pathIdParam, { pathId }, 'param')
  const data: PublishInput = parseInput(publishInput, input)
  const detail = pathDetail(pathId)
  const draft = detail.versions.find((v) => v.status === 'draft')
  if (!draft) throw ApiError.badRequest('There is no draft to publish')
  if (draft.items.length === 0) throw ApiError.badRequest('A path needs at least one item')
  const previous = detail.versions.find((v) => v.isCurrent) ?? null

  const at = nowIso()
  if (previous) {
    const row = db.pathVersions.find((v) => v.id === previous.id)
    if (row) updateRow(row, { status: 'archived' })
  }
  const draftRow = findOr404(db.pathVersions, (v) => v.id === draft.id, 'Draft not found')
  updateRow(draftRow, {
    status: 'published',
    changeNote: data.changeNote,
    publishedAt: at,
    publishedBy: viewer.id,
  })
  const path = findOr404(db.learningPaths, (p) => p.id === pathId, 'Learning path not found')
  updateRow(path, { currentVersionId: draft.id })
  audit({
    action: 'path.publish',
    objectType: 'learning_path',
    objectId: detail.path.code,
    before: previous
      ? { version: previous.version, items: previous.items.map(itemSignature) }
      : null,
    after: { version: draft.version, items: draft.items.map(itemSignature) },
    reason: data.changeNote,
  })

  let migrated = 0
  if (data.migrateOpen && previous) {
    // Completed and awaiting-review enrolments are never moved: their records stay on the
    // version they finished. Unit progress is keyed by course, so equivalents carry over.
    for (const enrolment of db.enrolments) {
      if (
        enrolment.pathId === pathId &&
        enrolment.pathVersionId !== draft.id &&
        (enrolment.status === 'not_started' || enrolment.status === 'in_progress')
      ) {
        updateRow(enrolment, { pathVersionId: draft.id })
        migrated += 1
      }
    }
    audit({
      action: 'path.migrate',
      objectType: 'learning_path',
      objectId: detail.path.code,
      before: { version: previous.version },
      after: { version: draft.version, enrolments: migrated },
      reason: data.migrationReason ?? null,
    })
  }
  commit()
  return {
    version: draft.version,
    previousVersion: previous?.version ?? null,
    migrated,
    retained:
      detail.versions.reduce((sum, v) => sum + (v.id === draft.id ? 0 : v.enrolments.total), 0) -
      migrated,
  }
}

export type PathsList = Awaited<ReturnType<typeof listPaths>>
export type CatalogueCourse = Awaited<ReturnType<typeof listCatalogue>>[number]
export type PathDetail = Awaited<ReturnType<typeof getPath>>
