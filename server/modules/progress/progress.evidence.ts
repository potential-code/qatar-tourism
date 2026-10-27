import type { db } from '@server/db/connection'
import {
  assessmentAttempts,
  assessments,
  attendance,
  courses,
  enrolments,
  learningPaths,
  pathItems,
  programmes,
  reviews,
  rolePlayAttempts,
  rsvps,
  sessionScores,
  sessions,
  submissions,
  unitProgress,
} from '@server/db/schema'
import { now } from '@server/lib/clock'
import type { ProgrammeCode } from '@shared/constants'
import { THRESHOLDS } from '@shared/constants'
import { and, asc, count, eq, ne } from 'drizzle-orm'
import type {
  AttemptEvidence,
  Evidence,
  PathItemInput,
  SessionEvidence,
  SubmissionEvidence,
  UnitEvidence,
} from './progress.rules'

/** Read-only access: the pooled db or a transaction. */
export type Reader = Pick<typeof db, 'select'>

export type EnrolmentContext = {
  id: string
  learnerId: string
  programmeId: string
  programme: ProgrammeCode
  programmeTitle: string
  certificationEnabled: boolean
  status: string
  progressPercent: number
  currentStage: string | null
  pathId: string | null
  pathVersionId: string | null
  assignmentReason: string | null
  overrideReason: string | null
  enrolledAt: Date
  startedAt: Date | null
  completedAt: Date | null
  lastActivityAt: Date | null
}

/** The learner's enrolment on one programme, or null. Ownership is the learner id itself. */
export async function findEnrolment(
  reader: Reader,
  learnerId: string,
  programme: ProgrammeCode,
): Promise<EnrolmentContext | null> {
  const [row] = await reader
    .select({
      id: enrolments.id,
      learnerId: enrolments.learnerId,
      programmeId: enrolments.programmeId,
      programme: programmes.code,
      programmeTitle: programmes.title,
      certificationEnabled: programmes.certificationEnabled,
      status: enrolments.status,
      progressPercent: enrolments.progressPercent,
      currentStage: enrolments.currentStage,
      pathId: enrolments.pathId,
      pathVersionId: enrolments.pathVersionId,
      assignmentReason: enrolments.assignmentReason,
      overrideReason: enrolments.overrideReason,
      enrolledAt: enrolments.enrolledAt,
      startedAt: enrolments.startedAt,
      completedAt: enrolments.completedAt,
      lastActivityAt: enrolments.lastActivityAt,
    })
    .from(enrolments)
    .innerJoin(programmes, eq(programmes.id, enrolments.programmeId))
    .where(and(eq(enrolments.learnerId, learnerId), eq(programmes.code, programme)))
    .limit(1)
  return row ?? null
}

/** Path items of the enrolment's own path version (learners keep their version, brief §14). */
export async function loadPathItems(
  reader: Reader,
  enrolment: Pick<EnrolmentContext, 'pathVersionId' | 'programmeId'>,
): Promise<PathItemInput[]> {
  let versionId = enrolment.pathVersionId
  if (!versionId) {
    const [fallback] = await reader
      .select({ versionId: learningPaths.currentVersionId })
      .from(learningPaths)
      .where(
        and(
          eq(learningPaths.programmeId, enrolment.programmeId),
          eq(learningPaths.isDefault, true),
        ),
      )
      .limit(1)
    versionId = fallback?.versionId ?? null
  }
  if (!versionId) return []
  const rows = await reader
    .select({
      id: pathItems.id,
      position: pathItems.position,
      kind: pathItems.kind,
      courseCode: courses.code,
      durationMinutes: courses.durationMinutes,
      scenarioKey: pathItems.scenarioKey,
      title: pathItems.title,
      required: pathItems.required,
      level: pathItems.level,
      stage: pathItems.stage,
    })
    .from(pathItems)
    .leftJoin(courses, eq(courses.id, pathItems.courseId))
    .where(eq(pathItems.pathVersionId, versionId))
    .orderBy(asc(pathItems.position))
  return rows.map((row) => ({
    ...row,
    courseCode: row.courseCode ?? null,
    durationMinutes: row.durationMinutes ?? null,
  }))
}

async function loadUnits(reader: Reader, enrolmentId: string) {
  const rows = await reader
    .select({
      code: courses.code,
      status: unitProgress.status,
      percent: unitProgress.percent,
      scoreRaw: unitProgress.scoreRaw,
      completedAt: unitProgress.completedAt,
    })
    .from(unitProgress)
    .innerJoin(courses, eq(courses.id, unitProgress.courseId))
    .where(eq(unitProgress.enrolmentId, enrolmentId))
  return new Map<string, UnitEvidence>(rows.map((row) => [row.code, row]))
}

async function loadAttempts(reader: Reader, enrolmentId: string): Promise<AttemptEvidence[]> {
  return reader
    .select({
      kind: assessments.kind,
      attemptNo: assessmentAttempts.attemptNo,
      status: assessmentAttempts.status,
      score: assessmentAttempts.score,
      competencyScores: assessmentAttempts.competencyScores,
      startedAt: assessmentAttempts.startedAt,
      submittedAt: assessmentAttempts.submittedAt,
    })
    .from(assessmentAttempts)
    .innerJoin(assessments, eq(assessments.id, assessmentAttempts.assessmentId))
    .where(eq(assessmentAttempts.enrolmentId, enrolmentId))
    .orderBy(asc(assessmentAttempts.startedAt))
}

async function loadRolePlayCount(reader: Reader, enrolmentId: string) {
  const [row] = await reader
    .select({ n: count() })
    .from(rolePlayAttempts)
    .where(eq(rolePlayAttempts.enrolmentId, enrolmentId))
  return row?.n ?? 0
}

/**
 * Trainer-led session evidence for Program A (brief §6, §10). A cancelled session never
 * unlocks anything, and absence never becomes a pass.
 */
export async function loadSessionEvidence(
  reader: Reader,
  learnerId: string,
  programmeId: string,
): Promise<SessionEvidence> {
  const rows = await reader
    .select({
      rsvpStatus: rsvps.status,
      sessionStatus: sessions.status,
      startsAt: sessions.startsAt,
      attendance: attendance.status,
      scoreStatus: sessionScores.status,
      total: sessionScores.total,
    })
    .from(rsvps)
    .innerJoin(sessions, eq(sessions.id, rsvps.sessionId))
    .leftJoin(attendance, eq(attendance.rsvpId, rsvps.id))
    .leftJoin(sessionScores, eq(sessionScores.rsvpId, rsvps.id))
    .where(
      and(
        eq(rsvps.learnerId, learnerId),
        eq(sessions.programmeId, programmeId),
        ne(sessions.status, 'cancelled'),
      ),
    )
  const instant = now()
  let passed = false
  let booked = false
  let awaitingScore = false
  let bestFinalScore: number | null = null
  for (const row of rows) {
    const present = row.attendance === 'attended' || row.attendance === 'late'
    if (present && row.scoreStatus === 'final' && row.total !== null) {
      bestFinalScore = Math.max(bestFinalScore ?? 0, row.total)
      if (row.total >= THRESHOLDS.sessionPass) passed = true
    }
    if (present && row.scoreStatus !== 'final') awaitingScore = true
    if (row.rsvpStatus === 'confirmed' && row.startsAt > instant) booked = true
  }
  return { passed, booked, awaitingScore, bestFinalScore }
}

async function loadSubmissions(reader: Reader, enrolmentId: string): Promise<SubmissionEvidence[]> {
  const rows = await reader
    .select({
      version: submissions.version,
      status: submissions.status,
      submittedAt: submissions.submittedAt,
      reviewStatus: reviews.status,
      reviewScore: reviews.rubricScore,
      reviewedAt: reviews.reviewedAt,
    })
    .from(submissions)
    .leftJoin(reviews, eq(reviews.submissionId, submissions.id))
    .where(eq(submissions.enrolmentId, enrolmentId))
    .orderBy(asc(submissions.version))
  return rows.map((row) => ({
    version: row.version,
    status: row.status,
    submittedAt: row.submittedAt,
    review:
      row.reviewStatus && row.reviewScore !== null && row.reviewedAt
        ? { status: row.reviewStatus, score: row.reviewScore, reviewedAt: row.reviewedAt }
        : null,
  }))
}

/** Everything the programme rules need to judge one enrolment. */
export async function loadEvidence(reader: Reader, enrolment: EnrolmentContext): Promise<Evidence> {
  const [items, units, attempts, rolePlayCount, submissionRows, session] = await Promise.all([
    loadPathItems(reader, enrolment),
    loadUnits(reader, enrolment.id),
    loadAttempts(reader, enrolment.id),
    loadRolePlayCount(reader, enrolment.id),
    loadSubmissions(reader, enrolment.id),
    enrolment.programme === 'A'
      ? loadSessionEvidence(reader, enrolment.learnerId, enrolment.programmeId)
      : Promise.resolve<SessionEvidence>({
          passed: false,
          booked: false,
          awaitingScore: false,
          bestFinalScore: null,
        }),
  ])
  return {
    programme: enrolment.programme,
    items,
    units,
    attempts,
    rolePlayCount,
    session,
    submissions: submissionRows,
  }
}
