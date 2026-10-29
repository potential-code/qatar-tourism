import type { Competency, ProgrammeCode } from '@shared/constants'
import { COMPETENCIES } from '@shared/constants'
import { COMPETENCY_LABELS } from '@shared/content/assessments'
import { programmeParam } from '@shared/schemas/learning-engine'
import { recommend } from './ai-path/logic'
import { ApiError, commit, delay, out, parseInput, requireRole, updateRow } from './api'
import { recordAudit } from './audit.service'
import { loadLearnerProfile, pathSummary } from './paths/learner-profile'
import { resolveForProfile, toRuleProfile, versionNumber } from './paths/resolve'
import {
  type EnrolmentContext,
  findEnrolment,
  findEnrolmentRow,
  loadEvidence,
  loadPathItems,
} from './progress/evidence'
import { recomputeEnrolment } from './progress/recompute'
import { baselineAttempt, itemMinutes } from './progress/rules'

/**
 * The scripted AI path generator (brief §9), formerly server/modules/ai-path. Demo mode: a
 * deterministic recommendation built from approved data only, on the signed-in learner's own
 * enrolment.
 */

const ACCEPTED_MARK = 'AI recommendation accepted'

function requireEnrolment(learnerId: string, programme: ProgrammeCode) {
  const enrolment = findEnrolment(learnerId, programme)
  if (!enrolment) throw ApiError.notFound('You are not enrolled in this programme')
  return enrolment
}

/** Builds the recommendation from approved data only. Pure reads, so it is safe to repeat. */
function build(enrolment: EnrolmentContext) {
  const profile = loadLearnerProfile(enrolment.learnerId)
  const evidence = loadEvidence(enrolment)
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
    : resolveForProfile(enrolment.programme, toRuleProfile(profile, weakest))
  const pathId = resolved?.pathId ?? enrolment.pathId
  // Learners keep the version they started on unless an admin migrates them (brief §14).
  const pathVersionId =
    resolved && resolved.pathId !== enrolment.pathId
      ? resolved.pathVersionId
      : enrolment.pathVersionId

  const items = loadPathItems({ pathVersionId, programmeId: enrolment.programmeId })
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
  const path = pathSummary(pathId)
  const totalMinutes = rec.requiredMinutes + rec.extraMinutes

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
              (key) => ({ key, label: COMPETENCY_LABELS[key], score: baselineScores?.[key] ?? 0 }),
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
      ? { ...path, versionId: pathVersionId, version: versionNumber(pathVersionId) }
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
      totalMinutes,
      weeklyMinutes: profile.weeklyMinutes,
      weeks:
        profile.weeklyMinutes && profile.weeklyMinutes > 0
          ? Math.max(1, Math.ceil(totalMinutes / profile.weeklyMinutes))
          : null,
    },
    accepted: (enrolment.assignmentReason ?? '').includes(ACCEPTED_MARK),
    assignmentReason: enrolment.assignmentReason,
    resolved,
    pathId,
    pathVersionId,
  }
}

/** The signed-in learner's recommended path for one programme. */
export async function getRecommendation(programme: ProgrammeCode) {
  await delay()
  const learnerId = requireRole('learner').id
  parseInput(programmeParam, { programme }, 'param')
  const {
    resolved: _r,
    pathId: _p,
    pathVersionId: _v,
    ...view
  } = build(requireEnrolment(learnerId, programme))
  return out(view)
}

export type Recommendation = Awaited<ReturnType<typeof getRecommendation>>

/**
 * The learner accepts the recommendation ("Start this path"). Records the path, its version and
 * the reason for assignment on the enrolment (brief §4, §14), audited. Repeating it is harmless.
 */
export async function acceptPath(programme: ProgrammeCode) {
  await delay()
  const viewer = requireRole('learner')
  parseInput(programmeParam, { programme }, 'param')
  const enrolment = requireEnrolment(viewer.id, programme)
  const built = build(enrolment)
  if (!built.inputs.baseline) {
    throw ApiError.badRequest('Complete your baseline assessment before building your path')
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

  const row = findEnrolmentRow(viewer.id, programme)?.row
  if (!row) throw ApiError.notFound('You are not enrolled in this programme')
  const before = { pathId: row.pathId, pathVersionId: row.pathVersionId }
  updateRow(row, {
    pathId: built.pathId,
    pathVersionId: built.pathVersionId,
    assignmentReason: reason,
  })
  recordAudit(viewer, {
    action: 'path.accept',
    objectType: 'enrolment',
    objectId: enrolment.id,
    before,
    after: {
      pathId: built.pathId,
      pathVersionId: built.pathVersionId,
      extras: built.extras.map((e) => e.courseCode),
    },
    reason,
  })
  recomputeEnrolment(viewer.id, programme)
  commit()
  return out({ accepted: true as const, assignmentReason: reason, path: built.path })
}
