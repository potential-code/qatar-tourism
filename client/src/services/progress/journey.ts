import type { Competency, ProgrammeCode } from '@shared/constants'
import { COMPETENCIES, THRESHOLDS } from '@shared/constants'
import { ASSESSMENT_VERSION, COMPETENCY_LABELS } from '@shared/content/assessments'
import { ROLEPLAY_SCENARIOS, SIMULATED_AI_LABEL } from '@shared/content/scenarios'
import { recommend } from '../ai-path/logic'
import { ApiError, db, delay, indexBy, out, requireRole } from '../api'
import { loadLearnerProfile, pathSummary } from '../paths/learner-profile'
import { findEnrolment, loadEvidence } from './evidence'
import {
  type AttemptEvidence,
  baselineAttempt,
  bestScore,
  type EvaluatedItem,
  evaluate,
  latestPostAttempt,
} from './rules'

/**
 * The learner's journey for one programme: the read model behind Overview, My learning and
 * Progress (brief §5 dashboard content). Everything is derived from the same rules as
 * `recomputeEnrolment`, so the dashboard and the stored status agree.
 */

const SCENARIO_ACTION: Record<string, string> = {
  'changed-booking': 'Practise responding to a disappointed visitor',
  'unclear-directions': 'Practise giving clear directions to a worried visitor',
  'accessibility-preference': 'Practise responding to an accessibility request',
  'group-running-late': 'Practise handling a group that is running late',
}

export function actionLabel(item: EvaluatedItem, programme: ProgrammeCode): string {
  switch (item.kind) {
    case 'assessment_pre':
      return 'Start pre-assessment'
    case 'assessment_post':
      return programme === 'A' ? 'Take the final assessment' : 'Take the post-assessment'
    case 'assessment_formative':
      return 'Take the foundation quiz'
    case 'ai_practice':
      return SCENARIO_ACTION[item.scenarioKey ?? ''] ?? SCENARIO_ACTION['changed-booking'] ?? ''
    case 'session':
      return 'Book a trainer-led session'
    case 'assignment':
      return 'Submit your practical assignment'
    case 'course':
      if (programme === 'B' && item.courseCode === 'C05')
        return 'Submit your short visitor response'
      return item.state === 'in_progress' ? `Continue: ${item.title}` : `Start: ${item.title}`
  }
}

type CompetencyRow = {
  key: Competency
  label: string
  baseline: number | null
  post: number | null
  foundation: number | null
}

function competencyRows(attempts: readonly AttemptEvidence[]): CompetencyRow[] {
  const baseline = baselineAttempt(attempts)
  const post = latestPostAttempt(attempts)
  const formative = attempts
    .filter((a) => a.kind === 'formative' && a.status === 'submitted')
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0]
  const pick = (a: AttemptEvidence | null | undefined, c: Competency) =>
    a?.competencyScores ? (a.competencyScores[c] ?? null) : null
  return COMPETENCIES.map((key) => ({
    key,
    label: COMPETENCY_LABELS[key],
    baseline: pick(baseline, key),
    post: pick(post, key),
    foundation: pick(formative, key),
  }))
}

function feedbackFor(enrolmentId: string, learnerId: string, programme: ProgrammeCode) {
  const users = indexBy(db.users, (u) => u.id)
  const submissions = indexBy(
    db.submissions.filter((s) => s.enrolmentId === enrolmentId),
    (s) => s.id,
  )
  const reviewRows = db.reviews
    .filter((r) => submissions.has(r.submissionId) && r.status !== 'draft')
    .sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt))
    .slice(0, 3)

  const sessions = indexBy(db.sessions, (s) => s.id)
  const trainers = indexBy(db.trainerProfiles, (t) => t.id)
  const ownRsvps = new Set(db.rsvps.filter((r) => r.learnerId === learnerId).map((r) => r.id))
  const sessionRows =
    programme === 'A'
      ? db.sessionScores
          .filter((s) => ownRsvps.has(s.rsvpId) && s.status === 'final' && s.feedback !== null)
          .flatMap((score) => {
            const session = sessions.get(score.sessionId)
            const trainer = session ? trainers.get(session.trainerId) : undefined
            return session && trainer ? [{ score, session, trainer }] : []
          })
          .sort((a, b) => (b.score.finalisedAt ?? '').localeCompare(a.score.finalisedAt ?? ''))
          .slice(0, 2)
      : []

  return [
    ...reviewRows.map((r) => {
      const reviewer = r.reviewerId ? users.get(r.reviewerId) : undefined
      const version = submissions.get(r.submissionId)?.version ?? 1
      return {
        source: 'assignment' as const,
        title:
          programme === 'A'
            ? `Practical assignment, version ${version}`
            : `Short response, version ${version}`,
        trainerName: reviewer?.name ?? 'Academy trainer',
        trainerImage: reviewer?.image ?? null,
        text: r.feedback,
        score: r.rubricScore,
        status: r.status,
        at: r.reviewedAt,
      }
    }),
    ...sessionRows.map(({ score, session, trainer }) => ({
      source: 'session' as const,
      title: session.title,
      trainerName: trainer.fullName,
      trainerImage: trainer.avatarPath,
      text: score.feedback ?? '',
      score: score.total,
      status: score.total >= THRESHOLDS.sessionPass ? ('approved' as const) : ('returned' as const),
      at: score.finalisedAt ?? new Date(0).toISOString(),
    })),
  ].sort((a, b) => b.at.localeCompare(a.at))
}

function practiceFor(enrolmentId: string) {
  const rows = db.rolePlayAttempts
    .filter((r) => r.enrolmentId === enrolmentId)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
  const scenarioTitle = (key: string) => ROLEPLAY_SCENARIOS.find((s) => s.key === key)?.title ?? key
  const latest = rows[0]
  return {
    label: SIMULATED_AI_LABEL,
    attempts: rows.map((r) => ({
      id: r.id,
      scenario: scenarioTitle(r.scenarioKey),
      mode: r.mode,
      score: r.totalPercent,
      completedAt: r.completedAt,
    })),
    best: rows.length > 0 ? Math.max(...rows.map((r) => r.totalPercent)) : null,
    latest: latest?.totalPercent ?? null,
    latestFeedback: latest
      ? {
          strength: latest.feedback.strength,
          improve: latest.feedback.improve,
          retry: latest.feedback.retry,
        }
      : null,
  }
}

function unitDetails(enrolmentId: string) {
  const courses = indexBy(db.courses, (c) => c.id)
  return db.unitProgress
    .filter((u) => u.enrolmentId === enrolmentId)
    .flatMap((u) => {
      const course = courses.get(u.courseId)
      return course
        ? [
            {
              code: course.code,
              status: u.status,
              percent: u.percent,
              scoreRaw: u.scoreRaw,
              lastActivityAt: u.lastActivityAt,
              completedAt: u.completedAt,
            },
          ]
        : []
    })
}

/** The journey for a learner id (no access check): used by `getJourney` and tests. */
export function journeyFor(learnerId: string, programme: ProgrammeCode) {
  const enrolment = findEnrolment(learnerId, programme)
  if (!enrolment) throw ApiError.notFound('You are not enrolled in this programme')

  const profile = loadLearnerProfile(learnerId)
  const evidence = loadEvidence(enrolment)
  const units = unitDetails(enrolment.id)
  const feedback = feedbackFor(enrolment.id, learnerId, programme)
  const practice = practiceFor(enrolment.id)
  const path = pathSummary(enrolment.pathId)
  const version = enrolment.pathVersionId
    ? db.pathVersions.find((v) => v.id === enrolment.pathVersionId)
    : undefined
  const certificate =
    programme === 'A'
      ? db.certificates
          .filter((c) => c.enrolmentId === enrolment.id)
          .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))[0]
      : undefined

  const result = evaluate(evidence)
  const unitByCode = new Map(units.map((u) => [u.code, u]))

  const baseline = baselineAttempt(evidence.attempts)
  const post = latestPostAttempt(evidence.attempts)
  const gain = baseline?.score != null && post?.score != null ? post.score - baseline.score : null

  const rec = recommend({
    programme,
    jobFunction: profile.jobFunction,
    baseline: (baseline?.competencyScores ?? null) as Partial<Record<Competency, number>> | null,
    pathItems: result.items.map((i) => ({
      kind: i.kind,
      courseCode: i.courseCode,
      required: i.required,
      level: i.level,
      title: i.title,
      estimatedMinutes: i.estimatedMinutes,
    })),
  })
  const extras = rec.extras.map((extra) => {
    const unit = unitByCode.get(extra.courseCode)
    return {
      ...extra,
      state: unit?.status === 'completed' ? 'completed' : unit ? 'in_progress' : 'available',
      percent: unit?.percent ?? 0,
    }
  })

  // Resume at the last activity (brief §5): the most recently touched unfinished unit.
  const resume =
    [...units]
      .filter((u) => u.status === 'in_progress' && u.lastActivityAt)
      .sort((a, b) => (b.lastActivityAt ?? '').localeCompare(a.lastActivityAt ?? ''))[0] ?? null

  const items = result.items.map((item) => {
    const unit = item.courseCode ? unitByCode.get(item.courseCode) : undefined
    return {
      ...item,
      actionLabel: actionLabel(item, programme),
      unit: unit
        ? {
            status: unit.status,
            percent: unit.percent,
            scoreRaw: unit.scoreRaw,
            completedAt: unit.completedAt,
          }
        : null,
    }
  })
  const next = result.nextItem ? (items.find((i) => i.id === result.nextItem?.id) ?? null) : null

  const lowPost =
    programme === 'B' && post?.score != null && post.score < THRESHOLDS.programmeBReviewSuggested
  const pendingExtra = extras.find((e) => e.state !== 'completed')
  const recommendation = lowPost
    ? {
        kind: 'review' as const,
        title: 'Review your lowest areas',
        body: `Your post-assessment was below ${THRESHOLDS.programmeBReviewSuggested} percent. A short review of the units linked to your lowest areas is suggested. It does not block completion.`,
        courseCode: rec.focusCourses[0] ?? null,
      }
    : pendingExtra && !result.complete
      ? {
          kind: 'extra' as const,
          title: `Recommended: ${pendingExtra.title}`,
          body: `${pendingExtra.reason}. A ${pendingExtra.minutes}-minute refresher chosen from your baseline. It is optional and does not change your required units.`,
          courseCode: pendingExtra.courseCode,
        }
      : null

  const assessmentView = (a: AttemptEvidence | null) =>
    a
      ? {
          score: a.score ?? 0,
          submittedAt: a.submittedAt?.toISOString() ?? null,
          attemptNo: a.attemptNo,
          version: ASSESSMENT_VERSION,
        }
      : null

  return {
    learner: {
      fullName: profile.fullName,
      firstName: profile.fullName.split(' ')[0] ?? profile.fullName,
      learnerCode: profile.learnerCode,
      jobTitle: profile.jobTitle,
      organisationName: profile.organisationName,
      goals: profile.goals,
      weeklyMinutes: profile.weeklyMinutes,
      profileComplete: profile.complete,
      completeness: profile.completeness,
    },
    enrolment: {
      programme,
      programmeTitle: enrolment.programmeTitle,
      certificationEnabled: enrolment.certificationEnabled,
      status: result.status,
      progressPercent: result.progressPercent,
      currentStage: result.currentStage,
      enrolledAt: enrolment.enrolledAt.toISOString(),
      startedAt: enrolment.startedAt?.toISOString() ?? null,
      completedAt: enrolment.completedAt?.toISOString() ?? null,
      lastActivityAt: enrolment.lastActivityAt?.toISOString() ?? null,
      pathName: path?.name ?? null,
      pathCode: path?.code ?? null,
      pathVersion: version?.version ?? null,
      assignmentReason: enrolment.assignmentReason,
      overrideReason: enrolment.overrideReason,
    },
    items,
    extras,
    gates: result.gates,
    nextAction: next
      ? { itemId: next.id, kind: next.kind, label: next.actionLabel, courseCode: next.courseCode }
      : null,
    resume: resume ? { courseCode: resume.code, percent: resume.percent } : null,
    remainingMinutes: result.remainingMinutes,
    assessments: {
      baseline: assessmentView(baseline),
      post: assessmentView(post),
      gainPoints: gain,
      foundationBest: bestScore(evidence.attempts, 'formative'),
      thresholds: {
        foundationQuiz: THRESHOLDS.foundationQuizPass,
        finalAssessment: THRESHOLDS.finalAssessmentPass,
        reviewSuggestedBelow: THRESHOLDS.programmeBReviewSuggested,
      },
    },
    competencies: competencyRows(evidence.attempts),
    practice,
    session: evidence.session,
    feedback,
    recommendation,
    rationale: rec.rationale,
    certificate: certificate
      ? { code: certificate.code, status: certificate.status, issuedAt: certificate.issuedAt }
      : null,
    complete: result.complete,
  }
}

/** The signed-in learner's journey for one programme. */
export async function getJourney(programme: ProgrammeCode) {
  await delay()
  return out(journeyFor(requireRole('learner').id, programme))
}

export type Journey = ReturnType<typeof journeyFor>

/** Attempt history for the Progress page (knowledge assessments; practice is separate). */
export async function getAttemptHistory(programme: ProgrammeCode) {
  await delay()
  const learnerId = requireRole('learner').id
  const enrolment = findEnrolment(learnerId, programme)
  if (!enrolment) throw ApiError.notFound('You are not enrolled in this programme')
  const assessments = indexBy(db.assessments, (a) => a.id)
  const items = db.assessmentAttempts
    .filter((a) => a.enrolmentId === enrolment.id)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .flatMap((r) => {
      const assessment = assessments.get(r.assessmentId)
      if (!assessment) return []
      return [
        {
          id: r.id,
          kind: assessment.kind,
          title:
            assessment.kind === 'post' && programme === 'A'
              ? 'Final assessment'
              : assessment.kind === 'pre'
                ? 'Baseline assessment'
                : assessment.title,
          version: assessment.version,
          attemptNo: r.attemptNo,
          status: r.status,
          score: r.score,
          competencyScores: r.competencyScores,
          startedAt: r.startedAt,
          submittedAt: r.submittedAt,
        },
      ]
    })
  return out({ items })
}
