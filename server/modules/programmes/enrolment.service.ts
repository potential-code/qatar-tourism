import { db } from '@server/db/connection'
import {
  assignmentRules,
  enrolments,
  learningPaths,
  organisations,
  profiles,
  programmes,
} from '@server/db/schema'
import { now } from '@server/lib/clock'
import { HttpError } from '@server/lib/errors'
import type { Viewer } from '@server/middleware/auth.middleware'
import { recordAudit } from '@server/modules/audit/audit.service'
import { recomputeEnrolment } from '@server/modules/progress/progress.service'
import type { LearningGoal, ProgrammeCode } from '@shared/constants'
import {
  type RuleDefinition,
  type RuleGroup,
  type RuleProfile,
  resolvePathRule,
} from '@shared/content/paths'
import { and, asc, eq } from 'drizzle-orm'

/**
 * Enrolment creation and path assignment for the public journeys (brief §3–4, §14):
 *   - visitor registration enrols on Program B with the default path until the profile is done,
 *   - the Program A CTA enrols on A explicitly, never touching an existing B enrolment,
 *   - a profile change OFFERS a revised path; completed unit progress is never deleted.
 */

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]
export type Executor = typeof db | Tx
export type Actor = Pick<Viewer, 'id' | 'role' | 'name'>

/** First stage label per programme, matching the seed's `current_stage` values. */
const FIRST_STAGE: Record<ProgrammeCode, string> = {
  A: 'Onboarding',
  B: 'Onboarding',
  C: 'Sample overview',
}

/** The learner's profile in the shape the rule engine reads. */
export async function ruleProfileFor(
  userId: string,
  executor: Executor = db,
): Promise<RuleProfile> {
  const [row] = await executor
    .select({
      status: profiles.status,
      jobFunction: profiles.jobFunction,
      jobTitle: profiles.jobTitle,
      seniority: profiles.seniority,
      experience: profiles.experience,
      goals: profiles.goals,
      organisationType: organisations.type,
      organisation: organisations.name,
    })
    .from(profiles)
    .leftJoin(organisations, eq(organisations.id, profiles.organisationId))
    .where(eq(profiles.userId, userId))
    .limit(1)
  if (!row) return { complete: false }
  return {
    complete: row.status === 'complete',
    organisationType: row.organisationType,
    organisation: row.organisation,
    jobFunction: row.jobFunction,
    jobTitle: row.jobTitle,
    seniority: row.seniority,
    experience: row.experience,
    goals: row.goals as LearningGoal[],
  }
}

/** Published assignment rules for a programme, as the admin path builder last saved them. */
async function rulesFor(code: ProgrammeCode, executor: Executor): Promise<RuleDefinition[]> {
  const rows = await executor
    .select({
      code: assignmentRules.code,
      name: assignmentRules.name,
      summary: assignmentRules.summary,
      priority: assignmentRules.priority,
      isDefault: assignmentRules.isDefault,
      conditions: assignmentRules.conditions,
      pathCode: learningPaths.code,
    })
    .from(assignmentRules)
    .innerJoin(programmes, eq(programmes.id, assignmentRules.programmeId))
    .innerJoin(learningPaths, eq(learningPaths.id, assignmentRules.pathId))
    .where(and(eq(programmes.code, code), eq(assignmentRules.status, 'published')))
    .orderBy(asc(assignmentRules.priority))
  return rows.map((row) => ({
    code: row.code,
    name: row.name,
    programme: code,
    pathCode: row.pathCode,
    priority: row.priority,
    isDefault: row.isDefault,
    conditions: row.conditions as RuleGroup,
    summary: row.summary,
    variation: '',
  }))
}

export type PathChoice = {
  pathId: string
  pathVersionId: string | null
  pathName: string
  reason: string
}

/** Resolves the path a learner should receive on a programme right now (brief §14 rules). */
export async function resolvePathFor(
  userId: string,
  code: ProgrammeCode,
  executor: Executor = db,
): Promise<PathChoice> {
  const [profile, rules] = await Promise.all([
    ruleProfileFor(userId, executor),
    rulesFor(code, executor),
  ])
  const resolution = resolvePathRule(code, profile, rules)
  const [path] = await executor
    .select({
      id: learningPaths.id,
      name: learningPaths.name,
      versionId: learningPaths.currentVersionId,
    })
    .from(learningPaths)
    .where(eq(learningPaths.code, resolution.rule.pathCode))
    .limit(1)
  if (!path) throw new Error(`Path ${resolution.rule.pathCode} is missing`)
  return {
    pathId: path.id,
    pathVersionId: path.versionId,
    pathName: path.name,
    reason: resolution.reason,
  }
}

async function programmeId(code: ProgrammeCode, executor: Executor) {
  const [row] = await executor
    .select({ id: programmes.id, status: programmes.status })
    .from(programmes)
    .where(eq(programmes.code, code))
    .limit(1)
  return row ?? null
}

export async function findEnrolment(userId: string, code: ProgrammeCode, executor: Executor = db) {
  const [row] = await executor
    .select({
      id: enrolments.id,
      status: enrolments.status,
      pathId: enrolments.pathId,
      overrideReason: enrolments.overrideReason,
      progressPercent: enrolments.progressPercent,
      startedAt: enrolments.startedAt,
    })
    .from(enrolments)
    .innerJoin(programmes, eq(programmes.id, enrolments.programmeId))
    .where(and(eq(enrolments.learnerId, userId), eq(programmes.code, code)))
    .limit(1)
  return row ?? null
}

/**
 * Enrols the learner on a programme. Idempotent: an existing enrolment is returned unchanged,
 * so a second click on "Join Program A" never resets progress. Other enrolments are untouched.
 */
export async function enrol(
  actor: Actor,
  learnerId: string,
  code: ProgrammeCode,
  executor: Executor = db,
): Promise<{ enrolmentId: string; created: boolean; pathName: string | null }> {
  const existing = await findEnrolment(learnerId, code, executor)
  if (existing) return { enrolmentId: existing.id, created: false, pathName: null }

  const programme = await programmeId(code, executor)
  if (programme?.status !== 'published') {
    throw new HttpError(409, 'PROGRAMME_CLOSED', `Program ${code} is not open for enrolment`)
  }
  const path = await resolvePathFor(learnerId, code, executor)
  const timestamp = now()
  const [created] = await executor
    .insert(enrolments)
    .values({
      learnerId,
      programmeId: programme.id,
      status: 'not_started',
      pathId: path.pathId,
      pathVersionId: path.pathVersionId,
      assignmentReason: path.reason,
      currentStage: FIRST_STAGE[code],
      progressPercent: 0,
      enrolledAt: timestamp,
      lastActivityAt: timestamp,
    })
    .onConflictDoNothing({ target: [enrolments.learnerId, enrolments.programmeId] })
    .returning({ id: enrolments.id })

  // A concurrent request won the insert: report the row that exists.
  if (!created) {
    const row = await findEnrolment(learnerId, code, executor)
    if (!row) throw new Error('Enrolment could not be created')
    return { enrolmentId: row.id, created: false, pathName: null }
  }

  await recordAudit(
    actor,
    {
      action: 'enrolment.create',
      objectType: 'enrolment',
      objectId: created.id,
      after: { programme: code, path: path.pathName, reason: path.reason },
    },
    executor,
  )
  await recomputeEnrolment(learnerId, code, executor)
  return { enrolmentId: created.id, created: true, pathName: path.pathName }
}

/** A learner enrolling themselves, in one transaction with its audit event. */
export function enrolSelf(actor: Actor, code: ProgrammeCode) {
  return db.transaction((tx) => enrol(actor, actor.id, code, tx))
}

export type PathRevision = {
  programme: ProgrammeCode
  enrolmentId: string
  currentPath: string | null
  suggestedPath: string
  reason: string
}

async function pathName(pathId: string | null, executor: Executor) {
  if (!pathId) return null
  const [row] = await executor
    .select({ name: learningPaths.name })
    .from(learningPaths)
    .where(eq(learningPaths.id, pathId))
    .limit(1)
  return row?.name ?? null
}

/**
 * Paths that would change under the learner's current profile (brief §4). Only offered, never
 * applied silently. An administrator override is respected: no offer replaces it.
 */
export async function pendingRevisions(
  learnerId: string,
  executor: Executor = db,
): Promise<PathRevision[]> {
  const out: PathRevision[] = []
  for (const code of ['A', 'B'] as const) {
    const enrolment = await findEnrolment(learnerId, code, executor)
    if (!enrolment || enrolment.overrideReason || enrolment.status === 'completed') continue
    const choice = await resolvePathFor(learnerId, code, executor)
    if (choice.pathId === enrolment.pathId) continue
    out.push({
      programme: code,
      enrolmentId: enrolment.id,
      currentPath: await pathName(enrolment.pathId, executor),
      suggestedPath: choice.pathName,
      reason: choice.reason,
    })
  }
  return out
}

/**
 * Moves an enrolment to the rule-resolved path. Unit progress rows belong to the enrolment and
 * the course, so completed units carry over and nothing is deleted. Audited with before/after.
 */
export async function applyRevision(
  actor: Actor,
  learnerId: string,
  code: ProgrammeCode,
  reasonSuffix: string,
  executor: Executor = db,
) {
  const enrolment = await findEnrolment(learnerId, code, executor)
  if (!enrolment) return null
  const choice = await resolvePathFor(learnerId, code, executor)
  if (choice.pathId === enrolment.pathId) return { changed: false, pathName: choice.pathName }
  const before = await pathName(enrolment.pathId, executor)
  await executor
    .update(enrolments)
    .set({
      pathId: choice.pathId,
      pathVersionId: choice.pathVersionId,
      assignmentReason: `${choice.reason}; ${reasonSuffix}`,
      updatedAt: now(),
    })
    .where(eq(enrolments.id, enrolment.id))
  await recordAudit(
    actor,
    {
      action: 'path.reassign',
      objectType: 'enrolment',
      objectId: enrolment.id,
      before: { path: before },
      after: { path: choice.pathName, rule: choice.reason },
      reason: reasonSuffix,
    },
    executor,
  )
  await recomputeEnrolment(learnerId, code, executor)
  return { changed: true, pathName: choice.pathName }
}

/** Learner's own enrolments, for the public pages ("You are enrolled") and the profile page. */
export async function listOwnEnrolments(learnerId: string) {
  const rows = await db
    .select({
      id: enrolments.id,
      programme: programmes.code,
      programmeTitle: programmes.title,
      status: enrolments.status,
      progressPercent: enrolments.progressPercent,
      currentStage: enrolments.currentStage,
      assignmentReason: enrolments.assignmentReason,
      pathName: learningPaths.name,
      enrolledAt: enrolments.enrolledAt,
    })
    .from(enrolments)
    .innerJoin(programmes, eq(programmes.id, enrolments.programmeId))
    .leftJoin(learningPaths, eq(learningPaths.id, enrolments.pathId))
    .where(eq(enrolments.learnerId, learnerId))
    .orderBy(asc(programmes.code))
  return rows.map((row) => ({ ...row, enrolledAt: row.enrolledAt.toISOString() }))
}
