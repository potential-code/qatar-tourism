import type { ProgrammeCode } from '@shared/constants'
import { THRESHOLDS } from '@shared/constants'
import type { EnrolmentRow } from '@shared/types/db'
import { db, now } from '../api'
import type {
  AttemptEvidence,
  Evidence,
  PathItemInput,
  SessionEvidence,
  SubmissionEvidence,
  UnitEvidence,
} from './rules'

/**
 * Loads what the programme rules judge (formerly server/modules/progress/progress.evidence.ts).
 * Evidence keeps `Date` instants, so `rules.ts` is unchanged from the server.
 */

const toDate = (iso: string) => new Date(iso)
const toDateOrNull = (iso: string | null) => (iso ? new Date(iso) : null)

export type EnrolmentContext = {
  id: string
  learnerId: string
  programmeId: string
  programme: ProgrammeCode
  programmeTitle: string
  certificationEnabled: boolean
  status: EnrolmentRow['status']
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

/** The live enrolment row of a learner on one programme, or null. */
export function findEnrolmentRow(learnerId: string, programme: ProgrammeCode) {
  const programmeRow = db.programmes.find((p) => p.code === programme)
  if (!programmeRow) return null
  const row = db.enrolments.find(
    (e) => e.learnerId === learnerId && e.programmeId === programmeRow.id,
  )
  return row ? { row, programme: programmeRow } : null
}

/** The learner's enrolment on one programme, or null. Ownership is the learner id itself. */
export function findEnrolment(
  learnerId: string,
  programme: ProgrammeCode,
): EnrolmentContext | null {
  const found = findEnrolmentRow(learnerId, programme)
  if (!found) return null
  const { row, programme: p } = found
  return {
    id: row.id,
    learnerId: row.learnerId,
    programmeId: row.programmeId,
    programme: p.code,
    programmeTitle: p.title,
    certificationEnabled: p.certificationEnabled,
    status: row.status,
    progressPercent: row.progressPercent,
    currentStage: row.currentStage,
    pathId: row.pathId,
    pathVersionId: row.pathVersionId,
    assignmentReason: row.assignmentReason,
    overrideReason: row.overrideReason,
    enrolledAt: toDate(row.enrolledAt),
    startedAt: toDateOrNull(row.startedAt),
    completedAt: toDateOrNull(row.completedAt),
    lastActivityAt: toDateOrNull(row.lastActivityAt),
  }
}

/** Path items of the enrolment's own path version (learners keep their version, brief §14). */
export function loadPathItems(
  enrolment: Pick<EnrolmentContext, 'pathVersionId' | 'programmeId'>,
): PathItemInput[] {
  const versionId =
    enrolment.pathVersionId ??
    db.learningPaths.find((p) => p.programmeId === enrolment.programmeId && p.isDefault)
      ?.currentVersionId ??
    null
  if (!versionId) return []
  return db.pathItems
    .filter((item) => item.pathVersionId === versionId)
    .sort((a, b) => a.position - b.position)
    .map((item) => {
      const course = item.courseId ? db.courses.find((c) => c.id === item.courseId) : undefined
      return {
        id: item.id,
        position: item.position,
        kind: item.kind,
        courseCode: course?.code ?? null,
        durationMinutes: course?.durationMinutes ?? null,
        scenarioKey: item.scenarioKey,
        title: item.title,
        required: item.required,
        level: item.level,
        stage: item.stage,
      }
    })
}

function loadUnits(enrolmentId: string): Map<string, UnitEvidence> {
  const units = new Map<string, UnitEvidence>()
  for (const unit of db.unitProgress) {
    if (unit.enrolmentId !== enrolmentId) continue
    const course = db.courses.find((c) => c.id === unit.courseId)
    if (!course) continue
    units.set(course.code, {
      status: unit.status,
      percent: unit.percent,
      scoreRaw: unit.scoreRaw,
      completedAt: toDateOrNull(unit.completedAt),
    })
  }
  return units
}

function loadAttempts(enrolmentId: string): AttemptEvidence[] {
  return db.assessmentAttempts
    .filter((a) => a.enrolmentId === enrolmentId)
    .flatMap((a) => {
      const assessment = db.assessments.find((x) => x.id === a.assessmentId)
      if (!assessment) return []
      return [
        {
          kind: assessment.kind,
          attemptNo: a.attemptNo,
          status: a.status,
          score: a.score,
          competencyScores: a.competencyScores,
          startedAt: toDate(a.startedAt),
          submittedAt: toDateOrNull(a.submittedAt),
        },
      ]
    })
    .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
}

/**
 * Trainer-led session evidence for Program A (brief §6, §10). A cancelled session never
 * unlocks anything, and absence never becomes a pass.
 */
export function loadSessionEvidence(learnerId: string, programmeId: string): SessionEvidence {
  const instant = now().getTime()
  let passed = false
  let booked = false
  let awaitingScore = false
  let bestFinalScore: number | null = null
  for (const rsvp of db.rsvps) {
    if (rsvp.learnerId !== learnerId) continue
    const session = db.sessions.find((s) => s.id === rsvp.sessionId)
    if (!session || session.programmeId !== programmeId || session.status === 'cancelled') continue
    const attendance = db.attendance.find((a) => a.rsvpId === rsvp.id)?.status
    const score = db.sessionScores.find((s) => s.rsvpId === rsvp.id)
    const present = attendance === 'attended' || attendance === 'late'
    if (present && score?.status === 'final') {
      bestFinalScore = Math.max(bestFinalScore ?? 0, score.total)
      if (score.total >= THRESHOLDS.sessionPass) passed = true
    }
    if (present && score?.status !== 'final') awaitingScore = true
    if (rsvp.status === 'confirmed' && Date.parse(session.startsAt) > instant) booked = true
  }
  return { passed, booked, awaitingScore, bestFinalScore }
}

/** Submissions with their FINAL review (drafts are for markers only). */
function loadSubmissions(enrolmentId: string): SubmissionEvidence[] {
  return db.submissions
    .filter((s) => s.enrolmentId === enrolmentId)
    .sort((a, b) => a.version - b.version)
    .map((s) => {
      const review = db.reviews.find((r) => r.submissionId === s.id && r.status !== 'draft')
      return {
        version: s.version,
        status: s.status,
        submittedAt: toDate(s.submittedAt),
        review:
          review && review.status !== 'draft'
            ? {
                status: review.status,
                score: review.rubricScore,
                reviewedAt: toDate(review.reviewedAt),
              }
            : null,
      }
    })
}

const NO_SESSION: SessionEvidence = {
  passed: false,
  booked: false,
  awaitingScore: false,
  bestFinalScore: null,
}

/** Everything the programme rules need to judge one enrolment. */
export function loadEvidence(enrolment: EnrolmentContext): Evidence {
  return {
    programme: enrolment.programme,
    items: loadPathItems(enrolment),
    units: loadUnits(enrolment.id),
    attempts: loadAttempts(enrolment.id),
    rolePlayCount: db.rolePlayAttempts.filter((r) => r.enrolmentId === enrolment.id).length,
    session:
      enrolment.programme === 'A'
        ? loadSessionEvidence(enrolment.learnerId, enrolment.programmeId)
        : { ...NO_SESSION },
    submissions: loadSubmissions(enrolment.id),
  }
}
