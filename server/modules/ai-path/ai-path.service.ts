import { db } from '@server/db/connection'
import { enrolments, pathVersions } from '@server/db/schema'
import { HttpError } from '@server/lib/errors'
import type { Viewer } from '@server/middleware/auth.middleware'
import { recordAudit } from '@server/modules/audit/audit.service'
import {
  loadLearnerProfile,
  pathSummary,
  resolveForProfile,
  toRuleProfile,
} from '@server/modules/paths/paths.service'
import {
  type EnrolmentContext,
  findEnrolment,
  loadEvidence,
  loadPathItems,
  type Reader,
} from '@server/modules/progress/progress.evidence'
import { baselineAttempt, itemMinutes } from '@server/modules/progress/progress.rules'
import { recomputeEnrolment } from '@server/modules/progress/progress.service'
import type { Competency, ProgrammeCode } from '@shared/constants'
import { COMPETENCIES } from '@shared/constants'
import { COMPETENCY_LABELS } from '@shared/content/assessments'
import { eq } from 'drizzle-orm'
import { recommend } from './ai-path.logic'

const ACCEPTED_MARK = 'AI recommendation accepted'

async function requireEnrolment(reader: Reader, learnerId: string, programme: ProgrammeCode) {
  const enrolment = await findEnrolment(reader, learnerId, programme)
  if (!enrolment) throw HttpError.notFound('You are not enrolled in this programme')
  return enrolment
}

async function versionNumber(reader: Reader, versionId: string | null) {
  if (!versionId) return null
  const [row] = await reader
    .select({ version: pathVersions.version })
    .from(pathVersions)
    .where(eq(pathVersions.id, versionId))
    .limit(1)
  return row?.version ?? null
}

/** Builds the recommendation from approved data only. Pure reads, so it is safe to repeat. */
async function build(reader: Reader, enrolment: EnrolmentContext) {
  const profile = await loadLearnerProfile(reader, enrolment.learnerId)
  const evidence = await loadEvidence(reader, enrolment)
  const baseline = baselineAttempt(evidence.attempts)
  const baselineScores = (baseline?.competencyScores ?? null) as Partial<
    Record<Competency, number>
  > | null
  const weakest = baselineScores
    ? (Object.entries(baselineScores).find(([, v]) => v === 0)?.[0] ?? null)
    : null

  // An administrator override always wins over the rules (brief §9, §14).
  const resolved = enrolment.overrideReason
    ? null
    : await resolveForProfile(reader, enrolment.programme, toRuleProfile(profile, weakest))
  const pathId = resolved?.pathId ?? enrolment.pathId
  // Learners keep the version they started on unless an admin migrates them (brief §14).
  const pathVersionId =
    resolved && resolved.pathId !== enrolment.pathId
      ? resolved.pathVersionId
      : enrolment.pathVersionId

  const items = await loadPathItems(reader, { pathVersionId, programmeId: enrolment.programmeId })
  const lite = items.map((item) => ({
    kind: item.kind,
    courseCode: item.courseCode,
    required: item.required,
    level: item.level,
    title: item.title,
    estimatedMinutes: itemMinutes(item, enrolment.programme),
  }))
  const rec = recommend({
    programme: enrolment.programme,
    jobFunction: profile.jobFunction,
    baseline: baselineScores,
    pathItems: lite,
  })
  const path = await pathSummary(reader, pathId)

  return {
    programme: enrolment.programme,
    programmeTitle: enrolment.programmeTitle,
    inputs: {
      programme: enrolment.programme,
      jobTitle: profile.jobTitle,
      jobFunction: profile.jobFunction,
      organisationName: profile.organisationName,
      organisationType: profile.organisationType,
      seniority: profile.seniority,
      experience: profile.experience,
      goals: profile.goals,
      weeklyMinutes: profile.weeklyMinutes,
      profileComplete: profile.complete,
      baseline: baseline
        ? {
            score: baseline.score ?? 0,
            submittedAt: baseline.submittedAt?.toISOString() ?? null,
            competencies: COMPETENCIES.filter((key) => baselineScores?.[key] !== undefined).map(
              (key) => ({
                key,
                label: COMPETENCY_LABELS[key],
                score: baselineScores?.[key] ?? 0,
              }),
            ),
          }
        : null,
    },
    rule: resolved
      ? {
          code: resolved.ruleCode,
          name: resolved.ruleName,
          summary: resolved.ruleSummary,
          priority: resolved.priority,
          reason: resolved.reason,
        }
      : null,
    override: enrolment.overrideReason,
    path: path
      ? { ...path, versionId: pathVersionId, version: await versionNumber(reader, pathVersionId) }
      : null,
    required: lite.filter((i) => i.required),
    extras: rec.extras,
    strengths: rec.strengths.map((c) => ({ key: c, label: COMPETENCY_LABELS[c] })),
    gaps: rec.gaps.map((c) => ({ key: c, label: COMPETENCY_LABELS[c] })),
    focusCourses: rec.focusCourses,
    rationale: rec.rationale,
    estimate: {
      requiredMinutes: rec.requiredMinutes,
      extraMinutes: rec.extraMinutes,
      totalMinutes: rec.requiredMinutes + rec.extraMinutes,
      weeklyMinutes: profile.weeklyMinutes,
      weeks:
        profile.weeklyMinutes && profile.weeklyMinutes > 0
          ? Math.max(1, Math.ceil((rec.requiredMinutes + rec.extraMinutes) / profile.weeklyMinutes))
          : null,
    },
    accepted: (enrolment.assignmentReason ?? '').includes(ACCEPTED_MARK),
    assignmentReason: enrolment.assignmentReason,
    resolved,
    pathId,
    pathVersionId,
  }
}

export async function getRecommendation(learnerId: string, programme: ProgrammeCode) {
  const enrolment = await requireEnrolment(db, learnerId, programme)
  const { resolved: _resolved, pathId: _p, pathVersionId: _v, ...view } = await build(db, enrolment)
  return view
}

/**
 * The learner accepts the recommendation ("Start this path"). Records the path, its version and
 * the reason for assignment on the enrolment (brief §4, §14), audited. Repeating it is harmless.
 */
export async function accept(viewer: Viewer, programme: ProgrammeCode) {
  return db.transaction(async (tx) => {
    const enrolment = await requireEnrolment(tx, viewer.id, programme)
    const built = await build(tx, enrolment)
    if (!built.inputs.baseline) {
      throw HttpError.badRequest('Complete your baseline assessment before building your path')
    }
    const extrasNote =
      built.extras.length > 0
        ? `recommended extras: ${built.extras.map((e) => `${e.courseCode} ${e.title}`).join(', ')}`
        : 'no extra units recommended'
    const base = enrolment.overrideReason
      ? `Administrator override kept (${enrolment.overrideReason})`
      : (built.resolved?.reason ?? 'Default path')
    const versionLabel = built.path?.version ? `, version ${built.path.version}` : ''
    const reason = `${base}${versionLabel}. ${ACCEPTED_MARK}; ${extrasNote}.`

    const before = { pathId: enrolment.pathId, pathVersionId: enrolment.pathVersionId }
    const after = { pathId: built.pathId, pathVersionId: built.pathVersionId }
    await tx
      .update(enrolments)
      .set({ pathId: built.pathId, pathVersionId: built.pathVersionId, assignmentReason: reason })
      .where(eq(enrolments.id, enrolment.id))
    await recordAudit(
      viewer,
      {
        action: 'path.accept',
        objectType: 'enrolment',
        objectId: enrolment.id,
        before,
        after: { ...after, extras: built.extras.map((e) => e.courseCode) },
        reason,
      },
      tx,
    )
    await recomputeEnrolment(viewer.id, programme, tx)
    return { accepted: true as const, assignmentReason: reason, path: built.path }
  })
}
