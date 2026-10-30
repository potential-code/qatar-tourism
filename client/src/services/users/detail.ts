import type { UserRow } from '@shared/types/db'
import { accountStatusOf } from '@shared/utils/identity'
import { db, indexBy } from '../api'

/**
 * Everything user management shows about one account (brief §14), formerly the reads of
 * server/modules/users/users.service.ts `getUserDetail`. Rows are read in place; the service
 * copies the result before handing it out.
 */

export type AccountStatus = 'active' | 'suspended' | 'invited' | 'locked'

const desc = (a: string | null, b: string | null) => (b ?? '').localeCompare(a ?? '')

export function accountStatus(user: UserRow): AccountStatus {
  const profile = db.profiles.find((p) => p.userId === user.id)
  if (profile?.suspended) return 'suspended'
  if (profile && accountStatusOf(profile) === 'locked') return 'locked'
  return user.emailVerified ? 'active' : 'invited'
}

function profileOf(userId: string) {
  const row = db.profiles.find((p) => p.userId === userId)
  if (!row) return null
  const org = row.organisationId
    ? db.organisations.find((o) => o.id === row.organisationId)
    : undefined
  return {
    learnerCode: row.learnerCode,
    fullName: row.fullName,
    organisationId: row.organisationId,
    organisationName: org?.name ?? null,
    organisationType: org?.type ?? null,
    jobTitle: row.jobTitle,
    jobFunction: row.jobFunction,
    seniority: row.seniority,
    experience: row.experience,
    country: row.country,
    city: row.city,
    preferredLanguage: row.preferredLanguage,
    goals: row.goals,
    status: row.status,
    suspended: row.suspended,
    /** Active, locked or disabled (SPEC §5), kept apart from approval, certificate and licence state. */
    accountStatus: accountStatusOf(row),
    lockReason: row.lockReason,
    lockedAt: row.lockedAt,
    lockedBy: row.lockedBy ? (db.users.find((u) => u.id === row.lockedBy)?.name ?? null) : null,
    registeredAt: row.registeredAt,
    lastActivityAt: row.lastActivityAt,
    completeness: row.completeness,
  }
}

function enrolmentsOf(userId: string) {
  const programmes = indexBy(db.programmes, (p) => p.id)
  const paths = indexBy(db.learningPaths, (p) => p.id)
  return db.enrolments
    .filter((e) => e.learnerId === userId)
    .flatMap((e) => {
      const programme = programmes.get(e.programmeId)
      if (!programme) return []
      return [
        {
          id: e.id,
          programme: programme.code,
          programmeTitle: programme.title,
          status: e.status,
          path: e.pathId ? (paths.get(e.pathId)?.name ?? null) : null,
          assignmentReason: e.assignmentReason,
          overrideReason: e.overrideReason,
          currentStage: e.currentStage,
          progress: e.progressPercent,
          enrolledAt: e.enrolledAt,
          startedAt: e.startedAt,
          completedAt: e.completedAt,
          lastActivityAt: e.lastActivityAt,
        },
      ]
    })
    .sort((a, b) => a.programme.localeCompare(b.programme))
}

function attemptsOf(userId: string) {
  const assessments = indexBy(db.assessments, (a) => a.id)
  const enrolments = indexBy(db.enrolments, (e) => e.id)
  const programmes = indexBy(db.programmes, (p) => p.id)
  return db.assessmentAttempts
    .filter((a) => a.learnerId === userId)
    .flatMap((a) => {
      const assessment = assessments.get(a.assessmentId)
      const enrolment = enrolments.get(a.enrolmentId)
      const programme = enrolment ? programmes.get(enrolment.programmeId) : undefined
      if (!assessment || !programme) return []
      return [
        {
          id: a.id,
          programme: programme.code,
          title: assessment.title,
          kind: assessment.kind,
          version: assessment.version,
          attemptNo: a.attemptNo,
          status: a.status,
          score: a.score,
          passPercent: assessment.passPercent,
          submittedAt: a.submittedAt,
          startedAt: a.startedAt,
        },
      ]
    })
    .sort((a, b) => desc(a.startedAt, b.startedAt))
}

function rolePlaysOf(userId: string) {
  return db.rolePlayAttempts
    .filter((r) => r.learnerId === userId)
    .map((r) => ({
      id: r.id,
      scenarioKey: r.scenarioKey,
      mode: r.mode,
      totalPercent: r.totalPercent,
      completedAt: r.completedAt,
    }))
    .sort((a, b) => desc(a.completedAt, b.completedAt))
}

function bookingsOf(userId: string) {
  const sessions = indexBy(db.sessions, (s) => s.id)
  const trainers = indexBy(db.trainerProfiles, (t) => t.id)
  const attendance = indexBy(db.attendance, (a) => a.rsvpId)
  return db.rsvps
    .filter((r) => r.learnerId === userId)
    .flatMap((r) => {
      const session = sessions.get(r.sessionId)
      const trainer = session ? trainers.get(session.trainerId) : undefined
      if (!session || !trainer) return []
      const mark = attendance.get(r.id)
      return [
        {
          id: r.id,
          sessionId: session.id,
          sessionCode: session.code,
          sessionTitle: session.title,
          format: session.format,
          startsAt: session.startsAt,
          sessionStatus: session.status,
          trainer: trainer.fullName,
          status: r.status,
          waitlistPosition: r.waitlistPosition,
          bookedAt: r.bookedAt,
          attendance: mark?.status ?? null,
          markedAt: mark?.markedAt ?? null,
        },
      ]
    })
    .sort((a, b) => desc(a.startsAt, b.startsAt))
}

/** Submissions with their final review: draft marks are visible to markers only. */
function submissionsOf(userId: string) {
  const assignments = indexBy(db.assignments, (a) => a.id)
  return db.submissions
    .filter((s) => s.learnerId === userId)
    .flatMap((s) => {
      const assignment = assignments.get(s.assignmentId)
      if (!assignment) return []
      const review = db.reviews
        .filter((r) => r.submissionId === s.id && r.status !== 'draft')
        .sort((a, b) => desc(a.reviewedAt, b.reviewedAt))[0]
      return [
        {
          id: s.id,
          assignment: assignment.title,
          version: s.version,
          status: s.status,
          submittedAt: s.submittedAt,
          score: review?.rubricScore ?? null,
          reviewStatus: review?.status ?? null,
          feedback: review?.feedback ?? null,
          reviewedAt: review?.reviewedAt ?? null,
        },
      ]
    })
    .sort((a, b) => desc(a.submittedAt, b.submittedAt))
}

function certificatesOf(userId: string) {
  return db.certificates
    .filter((c) => c.learnerId === userId)
    .map((c) => ({
      id: c.id,
      code: c.code,
      status: c.status,
      issuedAt: c.issuedAt,
      revokedAt: c.revokedAt,
    }))
}

function notificationsOf(userId: string) {
  return db.notifications
    .filter((n) => n.recipientId === userId)
    .map((n) => ({
      id: n.id,
      kind: n.kind,
      channel: n.channel,
      state: n.state,
      subject: n.subject,
      createdAt: n.createdAt,
    }))
    .sort((a, b) => desc(a.createdAt, b.createdAt))
}

function auditOf(objectIds: Set<string>) {
  return db.auditEvents
    .filter((a) => a.objectId !== null && objectIds.has(a.objectId))
    .map((a) => ({
      id: a.id,
      action: a.action,
      actorLabel: a.actorLabel,
      actorRole: a.actorRole,
      reason: a.reason,
      outcome: a.outcome,
      createdAt: a.createdAt,
    }))
    .sort((a, b) => desc(a.createdAt, b.createdAt))
}

/** Every record of one account, as the timeline and the detail page read them. */
export function loadUserDetail(user: UserRow) {
  const profile = profileOf(user.id)
  const enrolments = enrolmentsOf(user.id)
  const objectIds = new Set([user.id, ...enrolments.map((e) => e.id)])
  if (profile) objectIds.add(profile.learnerCode)
  return {
    account: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      status: accountStatus(user),
    },
    profile,
    enrolments,
    assessments: attemptsOf(user.id),
    rolePlays: rolePlaysOf(user.id),
    bookings: bookingsOf(user.id),
    submissions: submissionsOf(user.id),
    certificates: certificatesOf(user.id),
    notifications: notificationsOf(user.id),
    audit: auditOf(objectIds),
  }
}

export type UserDetailRecords = ReturnType<typeof loadUserDetail>
