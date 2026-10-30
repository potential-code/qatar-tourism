import type { ProgrammeCode } from '@shared/constants'
import { courseCodeParam, programmeQuery } from '@shared/schemas/learning-engine'
import type { UnitProgressRow, UserRow, XapiStatementRow } from '@shared/types/db'
import { z } from 'zod'
import { withDefaults } from '@/mocks/defaults'
import {
  ApiError,
  db,
  delay,
  newId,
  nowIso,
  out,
  parseInput,
  requireCapability,
  requireRole,
  commit as save,
  updateRow,
} from './api'
import type { Bookmark } from './content-library/bookmarks'
import { positionOf } from './content-library/bookmarks'
import {
  bookmarksOf,
  defaultVariant,
  type LibraryVariant,
  libraryVariant,
  libraryVariants,
  usableBookmark,
  variantRef,
} from './content-library/store'
import { recomputeEnrolment } from './progress/recompute'
import { requireUnitContext, writeUnit } from './progress/units'
import {
  ACTIVITY_BASE,
  ACTOR_HOME_PAGE,
  actorAccountName,
  LRS_ENDPOINT,
  LRS_LABEL,
  rowToStatement,
  type StatementInput,
  shortVerb,
  statementInput,
  VERBS,
} from './xapi/statement'

/**
 * The simulated learning record store for the xAPI sample activity (C09). The package sends
 * statements through the host bridge; this service checks the actor and the activity, stores a
 * row in `xapiStatements` (always `simulatedLrs: true`), keeps the package's state document (its
 * bookmark) per package, and counts a `completed` statement with a pass once for the unit. No
 * network calls are made.
 */

const packageIdSchema = z.string().regex(/^[a-z0-9-]{3,40}$/)
const recordBody = z.object({
  programme: z.enum(['A', 'B', 'C']),
  packageId: packageIdSchema,
  statement: statementInput,
})
const stateBody = z.object({
  programme: z.enum(['A', 'B', 'C']),
  packageId: packageIdSchema,
  location: z.string().max(100),
  suspendData: z.string().max(8000),
})
export type XapiRecordBody = z.infer<typeof recordBody>

function xapiVariant(
  code: string,
  packageId: string | undefined,
  unit: UnitProgressRow | null = null,
) {
  const { spec } = libraryVariants(code)
  if (spec.format !== 'xapi') throw ApiError.notFound('No xAPI activity for this unit')
  const variant = packageId ? libraryVariant(code, packageId) : defaultVariant(code, unit)
  if (variant.type !== 'xapi' || !variant.launchUrl) {
    throw ApiError.notFound('No xAPI activity for this unit')
  }
  return { spec, variant }
}

const profileOf = (userId: string) => db.profiles.find((p) => p.userId === userId)

function actorFor(user: UserRow) {
  const profile = profileOf(user.id)
  return {
    name: profile?.fullName ?? user.name,
    account: profile ? actorAccountName(profile.learnerCode) : `PREVIEW-${user.id}`,
  }
}

/** Table view of a stored row: who, what, when, result. Labelled simulated by the caller. */
function rowView(row: XapiStatementRow) {
  const user = db.users.find((u) => u.id === row.actorLearnerId)
  const actor = user ? actorFor(user) : { name: row.actorLearnerId, account: row.actorLearnerId }
  const variant = db.contentPackages.find((p) => p.packageId === row.packageId)
  return {
    id: row.id,
    statementId: row.statementId,
    actorName: actor.name,
    actorAccount: actor.account,
    verb: row.verb,
    activityId: row.activityId,
    activity: row.activityId.replace(ACTIVITY_BASE, ''),
    timestamp: row.timestamp,
    result: row.result,
    packageId: row.packageId,
    language: variant?.language ?? null,
    simulated: row.simulatedLrs,
    statement: rowToStatement(row, actor),
  }
}

export type StatementView = ReturnType<typeof rowView>

function checkStatement(statement: StatementInput, variant: LibraryVariant, user: UserRow) {
  const expected = actorFor(user)
  if (
    statement.actor.account.name !== expected.account ||
    statement.actor.account.homePage !== ACTOR_HOME_PAGE
  ) {
    throw ApiError.badRequest('The statement actor does not match the signed-in account')
  }
  const verb = shortVerb(statement.verb.id)
  if (!(VERBS as readonly string[]).includes(verb)) {
    throw ApiError.badRequest(`Verb "${verb}" is not one this activity reports`)
  }
  const base = `${ACTIVITY_BASE}${variant.packageId}`
  if (statement.object.id !== base && !statement.object.id.startsWith(`${base}/`)) {
    throw ApiError.badRequest('The statement is about a different activity')
  }
  return verb
}

/** Inserts the statement unless its id is already stored (a retry must not duplicate it). */
function storeStatement(
  statement: StatementInput,
  verb: string,
  userId: string,
  packageId: string,
) {
  const statementId = statement.id ?? newId()
  const existing = db.xapiStatements.find((s) => s.statementId === statementId)
  if (existing) return { row: existing, duplicate: true }
  const row = withDefaults('xapiStatements', {
    id: newId(),
    statementId,
    actorLearnerId: userId,
    verb,
    activityId: statement.object.id,
    packageId,
    timestamp: nowIso(),
    result: (statement.result as Record<string, unknown> | undefined) ?? null,
    simulatedLrs: true as const,
  })
  db.xapiStatements.push(row)
  return { row, duplicate: false }
}

const learnerStatements = (userId: string, packageIds: string[]) =>
  db.xapiStatements
    .filter((s) => s.actorLearnerId === userId && packageIds.includes(s.packageId))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))

// --- Learner ------------------------------------------------------------------------------------

/** Launch data: the actor, the endpoint (simulated), this package's saved state and its history. */
export async function getLaunch(programme: ProgrammeCode, code: string, packageId?: string) {
  await delay()
  const user = requireRole('learner')
  parseInput(courseCodeParam, { code }, 'param')
  parseInput(programmeQuery, { programme }, 'query')
  const { unit } = requireUnitContext(user.id, programme, code)
  const { spec, variant } = xapiVariant(code, packageId, unit)
  const bookmark = usableBookmark(unit, variant)
  const actor = actorFor(user)
  return out({
    package: {
      title: variant.title,
      type: variant.type,
      version: variant.version,
      launchUrl: variant.launchUrl as string,
      formatLabel: variant.formatLabel,
      packageId: variant.packageId,
      language: variant.language,
    },
    lrs: { label: LRS_LABEL, endpoint: LRS_ENDPOINT, simulated: true as const },
    actor: { name: actor.name, homePage: ACTOR_HOME_PAGE, account: actor.account },
    activityId: `${ACTIVITY_BASE}${variant.packageId}`,
    positions: spec.positions,
    state: {
      location: bookmark?.location ?? '',
      suspendData: bookmark?.suspendData ?? '',
      completion: bookmark?.completion ?? 'not attempted',
    },
    unit: {
      status: unit?.status ?? 'not_started',
      percent: unit?.percent ?? 0,
      completedAt: unit?.completedAt ?? null,
    },
    statements: learnerStatements(user.id, [variant.packageId]).slice(0, 50).map(rowView),
  })
}

export type XapiLaunch = Awaited<ReturnType<typeof getLaunch>>

/**
 * Stores one statement. A `completed` statement with `result.completion` and no failed success
 * completes the unit the first time only; later ones are stored but add no second credit.
 */
export async function recordStatement(code: string, input: XapiRecordBody) {
  await delay()
  const user = requireRole('learner')
  parseInput(courseCodeParam, { code }, 'param')
  const body = parseInput(recordBody, input)
  const ctx = requireUnitContext(user.id, body.programme, code)
  const { spec, variant } = xapiVariant(code, body.packageId, ctx.unit)
  const verb = checkStatement(body.statement, variant, user)
  const stored = storeStatement(body.statement, verb, user.id, variant.packageId)
  if (stored.duplicate) {
    return out({
      statementId: stored.row.statementId,
      duplicate: true,
      completedNow: false,
      unitStatus: ctx.unit?.status ?? 'not_started',
      enrolmentStatus: null,
    })
  }

  const passed =
    verb === 'completed' &&
    body.statement.result?.completion === true &&
    body.statement.result.success !== false
  const ref = variantRef(variant)
  const previous = usableBookmark(ctx.unit, variant)
  const bookmark: Bookmark = {
    packageId: ref.packageId,
    language: ref.language,
    schema: ref.bookmarkSchema,
    location: previous?.location ?? '',
    suspendData: previous?.suspendData ?? '',
    completion: passed ? 'completed' : (previous?.completion ?? 'incomplete'),
    success: passed ? 'passed' : (previous?.success ?? 'unknown'),
    scoreRaw: passed
      ? Math.round((body.statement.result?.score?.scaled ?? 1) * 100)
      : (previous?.scoreRaw ?? null),
    savedAt: nowIso(),
    mappedFrom: previous?.mappedFrom ?? null,
  }
  const position = positionOf(spec, bookmark.location)
  const extra = ctx.unit?.extra ?? {}
  const result = writeUnit(ctx, {
    cmiCompletionStatus: passed || ctx.unit?.status === 'completed' ? 'completed' : 'incomplete',
    scoreRaw: Math.max(ctx.unit?.scoreRaw ?? 0, bookmark.scoreRaw ?? 0) || null,
    location: bookmark.location,
    percent: Math.round((Math.min(spec.positions, position) / spec.positions) * 90),
    extra: {
      ...extra,
      bookmarks: { ...bookmarksOf(ctx.unit), [ref.packageId]: bookmark },
      activePackageId: ref.packageId,
    },
    complete: passed,
  })
  if (result.completedNow) {
    updateRow(result.unit, {
      extra: { ...(result.unit.extra ?? {}), completedPackageId: ref.packageId },
    })
  }
  const enrolmentStatus = recomputeEnrolment(user.id, body.programme)
  save()
  return out({
    statementId: stored.row.statementId,
    duplicate: false,
    completedNow: result.completedNow,
    unitStatus: result.unit.status,
    enrolmentStatus,
  })
}

/** The package's state document: where it is and what it holds, saved per package. */
export async function saveState(code: string, input: z.infer<typeof stateBody>) {
  await delay()
  const user = requireRole('learner')
  parseInput(courseCodeParam, { code }, 'param')
  const body = parseInput(stateBody, input)
  const ctx = requireUnitContext(user.id, body.programme, code)
  const { spec, variant } = xapiVariant(code, body.packageId, ctx.unit)
  const ref = variantRef(variant)
  const previous = usableBookmark(ctx.unit, variant)
  const bookmark: Bookmark = {
    packageId: ref.packageId,
    language: ref.language,
    schema: ref.bookmarkSchema,
    location: body.location,
    suspendData: body.suspendData,
    completion: previous?.completion ?? 'incomplete',
    success: previous?.success ?? 'unknown',
    scoreRaw: previous?.scoreRaw ?? null,
    savedAt: nowIso(),
    mappedFrom: previous?.mappedFrom ?? null,
  }
  writeUnit(ctx, {
    location: bookmark.location,
    suspendData: bookmark.suspendData,
    percent: Math.round(
      (Math.min(spec.positions, positionOf(spec, bookmark.location)) / spec.positions) * 90,
    ),
    extra: {
      ...(ctx.unit?.extra ?? {}),
      bookmarks: { ...bookmarksOf(ctx.unit), [ref.packageId]: bookmark },
      activePackageId: ref.packageId,
    },
  })
  save()
  return out({ saved: true as const, savedAt: bookmark.savedAt })
}

/** Clears this language's state document only. A counted completion is never undone. */
export async function restart(programme: ProgrammeCode, code: string, packageId?: string) {
  await delay()
  const user = requireRole('learner')
  parseInput(courseCodeParam, { code }, 'param')
  const ctx = requireUnitContext(user.id, programme, code)
  const { variant } = xapiVariant(code, packageId, ctx.unit)
  if (ctx.unit) {
    const bookmarks = bookmarksOf(ctx.unit)
    delete bookmarks[variant.packageId]
    updateRow(ctx.unit, { extra: { ...(ctx.unit.extra ?? {}), bookmarks } })
    save()
  }
  return out({ restarted: true as const })
}

// --- Admin tracking test ------------------------------------------------------------------------

/** The simulated LRS table for one package, newest first. Admin only. */
export async function listStatements(packageId: string) {
  await delay()
  requireCapability('content.manage')
  parseInput(packageIdSchema, packageId, 'param')
  const rows = db.xapiStatements
    .filter((s) => s.packageId === packageId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  return out({ label: LRS_LABEL, endpoint: LRS_ENDPOINT, items: rows.map(rowView) })
}

/** Preview launch for an admin: the actor is the admin's preview identity; no enrolment is touched. */
export async function previewLaunch(packageId: string) {
  await delay()
  const user = requireCapability('content.manage')
  const code = db.courses.find(
    (c) => c.id === db.contentPackages.find((p) => p.packageId === packageId)?.courseId,
  )?.code
  if (!code) throw ApiError.notFound('Package not found')
  const { spec, variant } = xapiVariant(code, packageId)
  const actor = actorFor(user)
  return out({
    package: {
      packageId: variant.packageId,
      language: variant.language,
      launchUrl: variant.launchUrl as string,
    },
    lrs: { label: LRS_LABEL, endpoint: LRS_ENDPOINT, simulated: true as const },
    actor: { name: actor.name, homePage: ACTOR_HOME_PAGE, account: actor.account },
    activityId: `${ACTIVITY_BASE}${variant.packageId}`,
    positions: spec.positions,
  })
}

/** Stores a preview statement from the admin's test launch. No unit credit, no learner record. */
export async function recordPreviewStatement(packageId: string, statement: StatementInput) {
  await delay()
  const user = requireCapability('content.manage')
  const parsed = parseInput(statementInput, statement)
  const code = db.courses.find(
    (c) => c.id === db.contentPackages.find((p) => p.packageId === packageId)?.courseId,
  )?.code
  if (!code) throw ApiError.notFound('Package not found')
  const { variant } = xapiVariant(code, packageId)
  const verb = checkStatement(parsed, variant, user)
  const stored = storeStatement(parsed, verb, user.id, variant.packageId)
  save()
  return out({ statementId: stored.row.statementId, duplicate: stored.duplicate })
}
