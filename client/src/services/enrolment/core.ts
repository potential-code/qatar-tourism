import type { LearningGoal, ProgrammeCode } from '@shared/constants'
import { type RuleDefinition, type RuleProfile, resolvePathRule } from '@shared/content/paths'
import { ApiError, db, insertRow, nowIso, updateRow, type Viewer } from '../api'
import { recordAudit } from '../audit.service'
import { recomputeEnrolment } from '../progress/recompute'

/**
 * Enrolment creation and path assignment for the public journeys (brief §3–4, §14), formerly
 * server/modules/programmes/enrolment.service.ts:
 *   - visitor registration enrols on Program B with the default path until the profile is done,
 *   - the Program A CTA enrols on A explicitly, never touching an existing B enrolment,
 *   - a profile change OFFERS a revised path; completed unit progress is never deleted.
 *
 * Pure helpers: synchronous, no latency and no access checks. The calling service checks who
 * may do this and calls `commit()` afterwards.
 */

export type Actor = Pick<Viewer, 'id' | 'role' | 'name'>

/** First stage label per programme, matching the seed's `current_stage` values. */
export const FIRST_STAGE: Record<ProgrammeCode, string> = {
  A: 'Onboarding',
  B: 'Onboarding',
  C: 'Sample overview',
}

/** The learner's profile in the shape the rule engine reads. */
export function ruleProfileFor(userId: string): RuleProfile {
  const profile = db.profiles.find((p) => p.userId === userId)
  if (!profile) return { complete: false }
  const organisation = profile.organisationId
    ? db.organisations.find((o) => o.id === profile.organisationId)
    : undefined
  return {
    complete: profile.status === 'complete',
    organisationType: organisation?.type ?? null,
    organisation: organisation?.name ?? null,
    jobFunction: profile.jobFunction,
    jobTitle: profile.jobTitle,
    seniority: profile.seniority,
    experience: profile.experience,
    goals: profile.goals as LearningGoal[],
  }
}

/** Published assignment rules for a programme, as the admin path builder last saved them. */
function rulesFor(code: ProgrammeCode): RuleDefinition[] {
  const programme = db.programmes.find((p) => p.code === code)
  if (!programme) return []
  return db.assignmentRules
    .filter((rule) => rule.programmeId === programme.id && rule.status === 'published')
    .sort((a, b) => a.priority - b.priority)
    .flatMap((rule) => {
      const path = db.learningPaths.find((p) => p.id === rule.pathId)
      if (!path) return []
      return [
        {
          code: rule.code,
          name: rule.name,
          programme: code,
          pathCode: path.code,
          priority: rule.priority,
          isDefault: rule.isDefault,
          conditions: rule.conditions,
          summary: rule.summary,
          variation: '',
        },
      ]
    })
}

export type PathChoice = {
  pathId: string
  pathVersionId: string | null
  pathName: string
  reason: string
}

/** Resolves the path a learner should receive on a programme right now (brief §14 rules). */
export function resolvePathFor(userId: string, code: ProgrammeCode): PathChoice {
  const resolution = resolvePathRule(code, ruleProfileFor(userId), rulesFor(code))
  const path = db.learningPaths.find((p) => p.code === resolution.rule.pathCode)
  if (!path) throw new Error(`Path ${resolution.rule.pathCode} is missing`)
  return {
    pathId: path.id,
    pathVersionId: path.currentVersionId,
    pathName: path.name,
    reason: resolution.reason,
  }
}

/** The learner's enrolment on a programme (the live row), or null. */
export function findEnrolment(userId: string, code: ProgrammeCode) {
  const programme = db.programmes.find((p) => p.code === code)
  if (!programme) return null
  return db.enrolments.find((e) => e.learnerId === userId && e.programmeId === programme.id) ?? null
}

/**
 * Enrols the learner on a programme. Idempotent: an existing enrolment is returned unchanged,
 * so a second click on "Join Program A" never resets progress. Other enrolments are untouched.
 */
export function enrol(
  actor: Actor,
  learnerId: string,
  code: ProgrammeCode,
): { enrolmentId: string; created: boolean; pathName: string | null } {
  const existing = findEnrolment(learnerId, code)
  if (existing) return { enrolmentId: existing.id, created: false, pathName: null }

  const programme = db.programmes.find((p) => p.code === code)
  if (programme?.status !== 'published') {
    throw new ApiError(409, 'PROGRAMME_CLOSED', `Program ${code} is not open for enrolment`)
  }
  const path = resolvePathFor(learnerId, code)
  const timestamp = nowIso()
  const created = insertRow('enrolments', {
    learnerId,
    programmeId: programme.id,
    status: 'not_started',
    pathId: path.pathId,
    pathVersionId: path.pathVersionId,
    assignmentReason: path.reason,
    overrideReason: null,
    overriddenBy: null,
    currentStage: FIRST_STAGE[code],
    progressPercent: 0,
    enrolledAt: timestamp,
    startedAt: null,
    completedAt: null,
    lastActivityAt: timestamp,
  })
  recordAudit(actor, {
    action: 'enrolment.create',
    objectType: 'enrolment',
    objectId: created.id,
    after: { programme: code, path: path.pathName, reason: path.reason },
  })
  recomputeEnrolment(learnerId, code)
  return { enrolmentId: created.id, created: true, pathName: path.pathName }
}

export type PathRevision = {
  programme: ProgrammeCode
  enrolmentId: string
  currentPath: string | null
  suggestedPath: string
  reason: string
}

const pathName = (pathId: string | null) =>
  pathId ? (db.learningPaths.find((p) => p.id === pathId)?.name ?? null) : null

/**
 * Paths that would change under the learner's current profile (brief §4). Only offered, never
 * applied silently. An administrator override is respected: no offer replaces it.
 */
export function pendingRevisions(learnerId: string): PathRevision[] {
  const revisions: PathRevision[] = []
  for (const code of ['A', 'B'] as const) {
    const enrolment = findEnrolment(learnerId, code)
    if (!enrolment || enrolment.overrideReason || enrolment.status === 'completed') continue
    const choice = resolvePathFor(learnerId, code)
    if (choice.pathId === enrolment.pathId) continue
    revisions.push({
      programme: code,
      enrolmentId: enrolment.id,
      currentPath: pathName(enrolment.pathId),
      suggestedPath: choice.pathName,
      reason: choice.reason,
    })
  }
  return revisions
}

/**
 * Moves an enrolment to the rule-resolved path. Unit progress rows belong to the enrolment and
 * the course, so completed units carry over and nothing is deleted. Audited with before/after.
 */
export function applyRevision(
  actor: Actor,
  learnerId: string,
  code: ProgrammeCode,
  reasonSuffix: string,
) {
  const enrolment = findEnrolment(learnerId, code)
  if (!enrolment) return null
  const choice = resolvePathFor(learnerId, code)
  if (choice.pathId === enrolment.pathId) return { changed: false, pathName: choice.pathName }
  const before = pathName(enrolment.pathId)
  updateRow(enrolment, {
    pathId: choice.pathId,
    pathVersionId: choice.pathVersionId,
    assignmentReason: `${choice.reason}; ${reasonSuffix}`,
  })
  recordAudit(actor, {
    action: 'path.reassign',
    objectType: 'enrolment',
    objectId: enrolment.id,
    before: { path: before },
    after: { path: choice.pathName, rule: choice.reason },
    reason: reasonSuffix,
  })
  recomputeEnrolment(learnerId, code)
  return { changed: true, pathName: choice.pathName }
}

/** Learner's own enrolments, for the public pages ("You are enrolled") and the profile page. */
export function listOwnEnrolments(learnerId: string) {
  return db.enrolments
    .filter((e) => e.learnerId === learnerId)
    .flatMap((e) => {
      const programme = db.programmes.find((p) => p.id === e.programmeId)
      if (!programme) return []
      return [
        {
          id: e.id,
          programme: programme.code,
          programmeTitle: programme.title,
          status: e.status,
          progressPercent: e.progressPercent,
          currentStage: e.currentStage,
          assignmentReason: e.assignmentReason,
          pathName: pathName(e.pathId),
          enrolledAt: e.enrolledAt,
        },
      ]
    })
    .sort((a, b) => a.programme.localeCompare(b.programme))
}
