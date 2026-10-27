import { db } from '@server/db/connection'
import { isFinalReview } from '@server/db/review-filters'
import {
  assessmentAttempts,
  assessments,
  certificates,
  courses,
  pathVersions,
  reviews,
  rolePlayAttempts,
  rsvps,
  sessionScores,
  sessions,
  submissions,
  trainerProfiles,
  unitProgress,
  user,
} from '@server/db/schema'
import { HttpError } from '@server/lib/errors'
import { recommend } from '@server/modules/ai-path/ai-path.logic'
import { loadLearnerProfile, pathSummary } from '@server/modules/paths/paths.service'
import type { Competency, ProgrammeCode } from '@shared/constants'
import { COMPETENCIES, THRESHOLDS } from '@shared/constants'
import { ASSESSMENT_VERSION, COMPETENCY_LABELS } from '@shared/content/assessments'
import { ROLEPLAY_SCENARIOS, SIMULATED_AI_LABEL } from '@shared/content/scenarios'
import { and, desc, eq, isNotNull } from 'drizzle-orm'
import { findEnrolment, loadEvidence } from './progress.evidence'
import {
  type AttemptEvidence,
  baselineAttempt,
  bestScore,
  type EvaluatedItem,
  evaluate,
  latestPostAttempt,
} from './progress.rules'

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

async function feedbackFor(enrolmentId: string, learnerId: string, programme: ProgrammeCode) {
  const reviewRows = await db
    .select({
      text: reviews.feedback,
      score: reviews.rubricScore,
      status: reviews.status,
      at: reviews.reviewedAt,
      trainerName: user.name,
      trainerImage: user.image,
      version: submissions.version,
    })
    .from(reviews)
    .innerJoin(submissions, eq(submissions.id, reviews.submissionId))
    .leftJoin(user, eq(user.id, reviews.reviewerId))
    .where(and(eq(submissions.enrolmentId, enrolmentId), isFinalReview))
    .orderBy(desc(reviews.reviewedAt))
    .limit(3)

  const sessionRows =
    programme === 'A'
      ? await db
          .select({
            text: sessionScores.feedback,
            score: sessionScores.total,
            at: sessionScores.finalisedAt,
            trainerName: trainerProfiles.fullName,
            trainerImage: trainerProfiles.avatarPath,
            sessionTitle: sessions.title,
          })
          .from(sessionScores)
          .innerJoin(rsvps, eq(rsvps.id, sessionScores.rsvpId))
          .innerJoin(sessions, eq(sessions.id, sessionScores.sessionId))
          .innerJoin(trainerProfiles, eq(trainerProfiles.id, sessions.trainerId))
          .where(
            and(
              eq(rsvps.learnerId, learnerId),
              eq(sessionScores.status, 'final'),
              isNotNull(sessionScores.feedback),
            ),
          )
          .orderBy(desc(sessionScores.finalisedAt))
          .limit(2)
      : []

  return [
    ...reviewRows.map((r) => ({
      source: 'assignment' as const,
      title:
        programme === 'A'
          ? `Practical assignment, version ${r.version}`
          : `Short response, version ${r.version}`,
      trainerName: r.trainerName ?? 'Academy trainer',
      trainerImage: r.trainerImage,
      text: r.text,
      score: r.score,
      status: r.status,
      at: r.at.toISOString(),
    })),
    ...sessionRows.map((r) => ({
      source: 'session' as const,
      title: r.sessionTitle,
      trainerName: r.trainerName,
      trainerImage: r.trainerImage,
      text: r.text ?? '',
      score: r.score,
      status: r.score >= THRESHOLDS.sessionPass ? ('approved' as const) : ('returned' as const),
      at: (r.at ?? new Date(0)).toISOString(),
    })),
  ].sort((a, b) => b.at.localeCompare(a.at))
}

async function practiceFor(enrolmentId: string) {
  const rows = await db
    .select({
      id: rolePlayAttempts.id,
      scenarioKey: rolePlayAttempts.scenarioKey,
      mode: rolePlayAttempts.mode,
      totalPercent: rolePlayAttempts.totalPercent,
      completedAt: rolePlayAttempts.completedAt,
      feedback: rolePlayAttempts.feedback,
    })
    .from(rolePlayAttempts)
    .where(eq(rolePlayAttempts.enrolmentId, enrolmentId))
    .orderBy(desc(rolePlayAttempts.completedAt))
  const scenarioTitle = (key: string) => ROLEPLAY_SCENARIOS.find((s) => s.key === key)?.title ?? key
  return {
    label: SIMULATED_AI_LABEL,
    attempts: rows.map((r) => ({
      id: r.id,
      scenario: scenarioTitle(r.scenarioKey),
      mode: r.mode,
      score: r.totalPercent,
      completedAt: r.completedAt.toISOString(),
    })),
    best: rows.length > 0 ? Math.max(...rows.map((r) => r.totalPercent)) : null,
    latest: rows[0]?.totalPercent ?? null,
    latestFeedback: rows[0]
      ? {
          strength: rows[0].feedback.strength,
          improve: rows[0].feedback.improve,
          retry: rows[0].feedback.retry,
        }
      : null,
  }
}

async function unitDetails(enrolmentId: string) {
  const rows = await db
    .select({
      code: courses.code,
      status: unitProgress.status,
      percent: unitProgress.percent,
      scoreRaw: unitProgress.scoreRaw,
      lastActivityAt: unitProgress.lastActivityAt,
      completedAt: unitProgress.completedAt,
    })
    .from(unitProgress)
    .innerJoin(courses, eq(courses.id, unitProgress.courseId))
    .where(eq(unitProgress.enrolmentId, enrolmentId))
  return rows
}

export async function getJourney(learnerId: string, programme: ProgrammeCode) {
  const enrolment = await findEnrolment(db, learnerId, programme)
  if (!enrolment) throw HttpError.notFound('You are not enrolled in this programme')

  const [profile, evidence, units, feedback, practice, path, versionRow, certificateRow] =
    await Promise.all([
      loadLearnerProfile(db, learnerId),
      loadEvidence(db, enrolment),
      unitDetails(enrolment.id),
      feedbackFor(enrolment.id, learnerId, programme),
      practiceFor(enrolment.id),
      pathSummary(db, enrolment.pathId),
      enrolment.pathVersionId
        ? db
            .select({ version: pathVersions.version })
            .from(pathVersions)
            .where(eq(pathVersions.id, enrolment.pathVersionId))
            .limit(1)
        : Promise.resolve([]),
      programme === 'A'
        ? db
            .select({
              code: certificates.code,
              status: certificates.status,
              issuedAt: certificates.issuedAt,
            })
            .from(certificates)
            .where(eq(certificates.enrolmentId, enrolment.id))
            .orderBy(desc(certificates.issuedAt))
            .limit(1)
        : Promise.resolve([]),
    ])

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
      .sort((a, b) => (b.lastActivityAt?.getTime() ?? 0) - (a.lastActivityAt?.getTime() ?? 0))[0] ??
    null

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
            completedAt: unit.completedAt?.toISOString() ?? null,
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

  const [certificate] = certificateRow as {
    code: string
    status: 'issued' | 'revoked'
    issuedAt: Date
  }[]
  const [version] = versionRow as { version: number }[]

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
      ? {
          code: certificate.code,
          status: certificate.status,
          issuedAt: certificate.issuedAt.toISOString(),
        }
      : null,
    complete: result.complete,
  }
}

export type Journey = Awaited<ReturnType<typeof getJourney>>

/** Attempt history for the Progress page (knowledge assessments; practice is separate). */
export async function getAttemptHistory(learnerId: string, programme: ProgrammeCode) {
  const enrolment = await findEnrolment(db, learnerId, programme)
  if (!enrolment) throw HttpError.notFound('You are not enrolled in this programme')
  const rows = await db
    .select({
      id: assessmentAttempts.id,
      kind: assessments.kind,
      title: assessments.title,
      version: assessments.version,
      attemptNo: assessmentAttempts.attemptNo,
      status: assessmentAttempts.status,
      score: assessmentAttempts.score,
      competencyScores: assessmentAttempts.competencyScores,
      startedAt: assessmentAttempts.startedAt,
      submittedAt: assessmentAttempts.submittedAt,
    })
    .from(assessmentAttempts)
    .innerJoin(assessments, eq(assessments.id, assessmentAttempts.assessmentId))
    .where(eq(assessmentAttempts.enrolmentId, enrolment.id))
    .orderBy(desc(assessmentAttempts.startedAt))
  return {
    items: rows.map((r) => ({
      ...r,
      title:
        r.kind === 'post' && programme === 'A'
          ? 'Final assessment'
          : r.kind === 'pre'
            ? 'Baseline assessment'
            : r.title,
      startedAt: r.startedAt.toISOString(),
      submittedAt: r.submittedAt?.toISOString() ?? null,
    })),
  }
}
