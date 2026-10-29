import type { ProgrammeCode } from '@shared/constants'
import type { AssignmentRow, AuditEventRow, ReviewRow, SubmissionRow } from '@shared/types/db'
import { db } from '../api'

/**
 * Read helpers shared by the learner and marking services (formerly assignments.queries.ts).
 * `reviews` also holds draft marks, which only markers may see: every learner view reads the
 * FINAL review (status other than 'draft').
 */

export type VersionRow = {
  submission: SubmissionRow
  /** The final review, or null (a draft never shows here). */
  review: ReviewRow | null
  reviewerName: string | null
  markerName: string | null
}

/** The submission's final review (returned or approved), ignoring a saved draft. */
export function finalReview(submissionId: string): ReviewRow | null {
  return db.reviews.find((r) => r.submissionId === submissionId && r.status !== 'draft') ?? null
}

/** The marker's saved draft, if the submission has not been finalised yet. */
export function draftReview(submissionId: string): ReviewRow | null {
  return db.reviews.find((r) => r.submissionId === submissionId && r.status === 'draft') ?? null
}

/** The trainer's display name for a trainer profile id. */
export function trainerName(trainerId: string | null): string | null {
  if (!trainerId) return null
  return db.trainerProfiles.find((t) => t.id === trainerId)?.fullName ?? null
}

function versionRow(submission: SubmissionRow): VersionRow {
  const review = finalReview(submission.id)
  const reviewer = review?.reviewerId ? db.users.find((u) => u.id === review.reviewerId) : null
  return {
    submission,
    review,
    reviewerName: reviewer?.name ?? null,
    markerName: trainerName(submission.markerTrainerId),
  }
}

/** Every version of one assignment for one enrolment, newest first. */
export function versionsOf(assignmentId: string, enrolmentId: string): VersionRow[] {
  return db.submissions
    .filter((s) => s.assignmentId === assignmentId && s.enrolmentId === enrolmentId)
    .sort((a, b) => b.version - a.version)
    .map(versionRow)
}

export type SubmissionContext = {
  submission: SubmissionRow
  assignment: AssignmentRow
  programmeCode: ProgrammeCode
  programmeTitle: string
  learnerCode: string
  learnerName: string
}

/** The submission with its assignment, programme and learner identity. */
export function submissionContext(submissionId: string): SubmissionContext | null {
  const submission = db.submissions.find((s) => s.id === submissionId)
  const assignment = db.assignments.find((a) => a.id === submission?.assignmentId)
  const programme = db.programmes.find((p) => p.id === assignment?.programmeId)
  const profile = db.profiles.find((p) => p.userId === submission?.learnerId)
  if (!submission || !assignment || !programme || !profile) return null
  return {
    submission,
    assignment,
    programmeCode: programme.code,
    programmeTitle: programme.title,
    learnerCode: profile.learnerCode,
    learnerName: profile.fullName,
  }
}

/** Assignment definitions for the given programme ids, by code. */
export function assignmentsForProgrammes(programmeIds: readonly string[]): AssignmentRow[] {
  return db.assignments
    .filter((a) => programmeIds.includes(a.programmeId))
    .sort((a, b) => a.code.localeCompare(b.code))
}

/** The learner's enrolments with programme details, by programme code. */
export function learnerEnrolments(learnerId: string) {
  const programmes = new Map(db.programmes.map((p) => [p.id, p]))
  return db.enrolments
    .filter((e) => e.learnerId === learnerId)
    .flatMap((e) => {
      const programme = programmes.get(e.programmeId)
      return programme
        ? [
            {
              id: e.id,
              programmeId: e.programmeId,
              programmeCode: programme.code,
              programmeTitle: programme.title,
            },
          ]
        : []
    })
    .sort((a, b) => a.programmeCode.localeCompare(b.programmeCode))
}

export const MARKING_ACTIONS = ['marking.draft', 'marking.finalise', 'marking.correct'] as const

/** Marking audit trail for the given submissions, oldest first. */
export function markingEvents(submissionIds: readonly string[]): AuditEventRow[] {
  if (submissionIds.length === 0) return []
  const ids = new Set(submissionIds)
  return db.auditEvents
    .filter(
      (e) =>
        e.objectType === 'submission' &&
        e.objectId !== null &&
        ids.has(e.objectId) &&
        (MARKING_ACTIONS as readonly string[]).includes(e.action),
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
}
