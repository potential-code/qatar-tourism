import type { ProgrammeCode } from '@shared/constants'
import { enrolInput } from '@shared/schemas/learning'
import { ApiError, commit, db, delay, insertRow, nowIso, out, parseInput, requireRole } from './api'
import { recordAudit } from './audit.service'
import { loadLearnerProfile } from './paths/learner-profile'
import { resolveForProfile, toRuleProfile } from './paths/resolve'

/**
 * The learner's own enrolments (brief §3, §5, §11), formerly the enrolments module and the
 * learner half of the programmes module. Learners read and create their own enrolments only.
 */

/** The signed-in learner's enrolments, for the programme switcher (brief §5). */
export async function listMine() {
  await delay()
  const learnerId = requireRole('learner').id
  const profile = loadLearnerProfile(learnerId)
  const items = db.enrolments
    .filter((e) => e.learnerId === learnerId)
    .flatMap((e) => {
      const programme = db.programmes.find((p) => p.id === e.programmeId)
      if (!programme) return []
      return [
        {
          id: e.id,
          programme: programme.code,
          programmeTitle: programme.title,
          certificationEnabled: programme.certificationEnabled,
          isIllustrative: programme.isIllustrative,
          cardImagePath: programme.cardImagePath,
          status: e.status,
          progressPercent: e.progressPercent,
          currentStage: e.currentStage,
          enrolledAt: e.enrolledAt,
          lastActivityAt: e.lastActivityAt,
        },
      ]
    })
    .sort((a, b) => a.programme.localeCompare(b.programme))
  return out({
    learner: {
      fullName: profile.fullName,
      firstName: profile.fullName.split(' ')[0] ?? profile.fullName,
      learnerCode: profile.learnerCode,
      jobTitle: profile.jobTitle,
      organisationName: profile.organisationName,
    },
    items,
  })
}

/**
 * Enrols the signed-in learner with the path the published rules assign (formerly
 * POST /enrolments). An existing enrolment is returned untouched.
 */
export async function enrol(input: { programme: ProgrammeCode }) {
  await delay()
  const actor = requireRole('learner')
  const { programme } = parseInput(enrolInput, input)
  const programmeRow = db.programmes.find((p) => p.code === programme)
  if (programmeRow?.status !== 'published') {
    throw ApiError.badRequest('This programme is not open for enrolment')
  }
  const existing = db.enrolments.find(
    (e) => e.learnerId === actor.id && e.programmeId === programmeRow.id,
  )
  if (existing) return out({ enrolmentId: existing.id, created: false })

  const resolved = resolveForProfile(programme, toRuleProfile(loadLearnerProfile(actor.id)))
  const row = insertRow('enrolments', {
    learnerId: actor.id,
    programmeId: programmeRow.id,
    status: 'not_started',
    pathId: resolved?.pathId ?? null,
    pathVersionId: resolved?.pathVersionId ?? null,
    assignmentReason: resolved?.reason ?? 'Default path',
    overrideReason: null,
    overriddenBy: null,
    currentStage:
      programme === 'A'
        ? 'Onboarding'
        : programme === 'B'
          ? 'Visitor Service Essentials'
          : 'Sample overview',
    progressPercent: 0,
    enrolledAt: nowIso(),
    startedAt: null,
    completedAt: null,
    lastActivityAt: null,
  })
  recordAudit(actor, {
    action: 'enrolment.create',
    objectType: 'enrolment',
    objectId: row.id,
    after: { programme, pathId: resolved?.pathId ?? null },
    reason: resolved?.reason ?? 'Default path',
  })
  commit()
  return out({ enrolmentId: row.id, created: true })
}
