import { db } from '@server/db/connection'
import {
  assessmentAttempts,
  assessments,
  assignments,
  auditEvents,
  certificates,
  notifications,
  profiles,
  programmes,
  reviews,
  sessions,
  submissions,
  trainerProfiles,
  trainerProgrammes,
  user,
} from '@server/db/schema'
import type { Viewer } from '@server/middleware/auth.middleware'
import { desc, eq, like } from 'drizzle-orm'
import { recordAudit } from '../audit/audit.service'

/**
 * Report-specific reads that the shared analytics facts do not carry. Everything here is a plain
 * select; shaping into report rows happens in the registry.
 */

/** Learner emails by user id: a CONTACT field, stripped for every role that may not see it. */
export async function learnerEmails() {
  const rows = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(eq(user.role, 'learner'))
  return new Map(rows.map((row) => [row.id, row.email]))
}

export async function trainerDetails() {
  const [profileRows, approvals] = await Promise.all([
    db
      .select({
        id: trainerProfiles.id,
        code: trainerProfiles.code,
        name: trainerProfiles.fullName,
        headline: trainerProfiles.headline,
        expertise: trainerProfiles.expertise,
        languages: trainerProfiles.languages,
        organisation: trainerProfiles.organisation,
      })
      .from(trainerProfiles)
      .orderBy(trainerProfiles.code),
    db
      .select({ trainerId: trainerProgrammes.trainerId, programme: programmes.code })
      .from(trainerProgrammes)
      .innerJoin(programmes, eq(programmes.id, trainerProgrammes.programmeId)),
  ])
  return profileRows.map((row) => ({
    ...row,
    programmes: approvals
      .filter((a) => a.trainerId === row.id)
      .map((a) => a.programme)
      .sort(),
  }))
}

export async function attemptRows() {
  return db
    .select({
      id: assessmentAttempts.id,
      enrolmentId: assessmentAttempts.enrolmentId,
      title: assessments.title,
      kind: assessments.kind,
      version: assessments.version,
      passPercent: assessments.passPercent,
      attemptNo: assessmentAttempts.attemptNo,
      status: assessmentAttempts.status,
      score: assessmentAttempts.score,
      submittedAt: assessmentAttempts.submittedAt,
    })
    .from(assessmentAttempts)
    .innerJoin(assessments, eq(assessments.id, assessmentAttempts.assessmentId))
}

export async function submissionRows() {
  return db
    .select({
      id: submissions.id,
      enrolmentId: submissions.enrolmentId,
      assignment: assignments.title,
      assignmentCode: assignments.code,
      version: submissions.version,
      status: submissions.status,
      submittedAt: submissions.submittedAt,
      wordCount: submissions.wordCount,
      marker: trainerProfiles.fullName,
      markerCode: trainerProfiles.code,
      score: reviews.rubricScore,
      feedback: reviews.feedback,
      reviewedAt: reviews.reviewedAt,
    })
    .from(submissions)
    .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
    .leftJoin(trainerProfiles, eq(trainerProfiles.id, submissions.markerTrainerId))
    .leftJoin(reviews, eq(reviews.submissionId, submissions.id))
}

export async function certificateRows() {
  return db
    .select({
      id: certificates.id,
      code: certificates.code,
      enrolmentId: certificates.enrolmentId,
      programme: programmes.code,
      learnerName: certificates.learnerName,
      learnerCode: profiles.learnerCode,
      status: certificates.status,
      issuedAt: certificates.issuedAt,
      revokedAt: certificates.revokedAt,
      revokeReason: certificates.revokeReason,
      evidence: certificates.evidence,
    })
    .from(certificates)
    .innerJoin(programmes, eq(programmes.id, certificates.programmeId))
    .innerJoin(profiles, eq(profiles.userId, certificates.learnerId))
}

export async function notificationRows() {
  return db
    .select({
      eventId: notifications.eventId,
      kind: notifications.kind,
      channel: notifications.channel,
      state: notifications.state,
      recipientId: notifications.recipientId,
      subject: notifications.subject,
      createdAt: notifications.createdAt,
      sessionCode: sessions.code,
      sessionTitle: sessions.title,
      actorName: user.name,
      actorRole: user.role,
    })
    .from(notifications)
    .leftJoin(sessions, eq(sessions.id, notifications.sessionId))
    .leftJoin(user, eq(user.id, notifications.actorId))
}

export async function exportEvents() {
  return db
    .select()
    .from(auditEvents)
    .where(like(auditEvents.action, 'export.%'))
    .orderBy(desc(auditEvents.createdAt))
}

/**
 * Audit trail for exports (brief §11: "Track … exports"). Allowed exports record what left the
 * system (report, row count, columns, filters); denied attempts are recorded with outcome
 * 'denied' so the admin can see them in Notifications and exports.
 */
export async function recordExport(
  viewer: Viewer,
  summary: Record<string, unknown> & { report: string },
  outcome: 'allowed' | 'denied',
  requestId?: string,
) {
  await recordAudit(
    viewer,
    {
      action: outcome === 'allowed' ? 'export.report_csv' : 'export.denied',
      objectType: 'export',
      objectId: summary.report,
      after: summary,
      reason: outcome === 'denied' ? 'Role does not allow this export' : null,
      outcome,
    },
    db,
    requestId,
  )
}
