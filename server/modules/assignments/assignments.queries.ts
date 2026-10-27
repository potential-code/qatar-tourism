import { db } from '@server/db/connection'
import {
  assignments,
  auditEvents,
  enrolments,
  profiles,
  programmes,
  reviews,
  submissions,
  trainerProfiles,
  user,
} from '@server/db/schema'
import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

/** Read helpers shared by the learner and marking services. Only services import this file. */

const reviewer = alias(user, 'reviewer')

export const versionColumns = {
  submission: submissions,
  review: reviews,
  reviewerName: reviewer.name,
  markerName: trainerProfiles.fullName,
}

/** Every version of one assignment for one enrolment, newest first. */
export async function versionsOf(assignmentId: string, enrolmentId: string) {
  return db
    .select(versionColumns)
    .from(submissions)
    .leftJoin(reviews, eq(reviews.submissionId, submissions.id))
    .leftJoin(reviewer, eq(reviewer.id, reviews.reviewerId))
    .leftJoin(trainerProfiles, eq(trainerProfiles.id, submissions.markerTrainerId))
    .where(
      and(eq(submissions.assignmentId, assignmentId), eq(submissions.enrolmentId, enrolmentId)),
    )
    .orderBy(desc(submissions.version))
}

export type VersionRow = Awaited<ReturnType<typeof versionsOf>>[number]

/** The submission with its assignment, programme and learner identity. */
export async function submissionContext(submissionId: string) {
  const [row] = await db
    .select({
      submission: submissions,
      assignment: assignments,
      programmeCode: programmes.code,
      programmeTitle: programmes.title,
      learnerCode: profiles.learnerCode,
      learnerName: profiles.fullName,
    })
    .from(submissions)
    .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
    .innerJoin(programmes, eq(programmes.id, assignments.programmeId))
    .innerJoin(profiles, eq(profiles.userId, submissions.learnerId))
    .where(eq(submissions.id, submissionId))
    .limit(1)
  return row ?? null
}

export type SubmissionContext = NonNullable<Awaited<ReturnType<typeof submissionContext>>>

/** Assignment definitions for the given programme ids. */
export async function assignmentsForProgrammes(programmeIds: string[]) {
  if (programmeIds.length === 0) return []
  return db
    .select()
    .from(assignments)
    .where(inArray(assignments.programmeId, programmeIds))
    .orderBy(asc(assignments.code))
}

/** The learner's enrolments with programme details. */
export async function learnerEnrolments(learnerId: string) {
  return db
    .select({
      id: enrolments.id,
      programmeId: enrolments.programmeId,
      programmeCode: programmes.code,
      programmeTitle: programmes.title,
    })
    .from(enrolments)
    .innerJoin(programmes, eq(programmes.id, enrolments.programmeId))
    .where(eq(enrolments.learnerId, learnerId))
    .orderBy(asc(programmes.code))
}

export const MARKING_ACTIONS = ['marking.draft', 'marking.finalise', 'marking.correct'] as const

/** Marking audit trail for the given submissions, oldest first. */
export async function markingEvents(submissionIds: string[]) {
  if (submissionIds.length === 0) return []
  return db
    .select()
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.objectType, 'submission'),
        inArray(auditEvents.objectId, submissionIds),
        inArray(auditEvents.action, [...MARKING_ACTIONS]),
      ),
    )
    .orderBy(asc(auditEvents.createdAt), asc(auditEvents.id))
}
