import { db, indexBy } from '../api'
import { byNewest } from '../audit.service'

/**
 * Report-specific reads that the shared analytics facts do not carry (formerly the selects in
 * reports.service.ts). Plain joins over the demo tables; shaping into report rows happens in the
 * definitions. Instants stay ISO strings.
 */

/** Learner emails by user id: a CONTACT field, stripped for every role that may not see it. */
export function learnerEmails(): Map<string, string> {
  return new Map(db.users.filter((u) => u.role === 'learner').map((u) => [u.id, u.email]))
}

export function trainerDetails() {
  const programmes = indexBy(db.programmes, (p) => p.id)
  return [...db.trainerProfiles]
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((t) => ({
      id: t.id,
      code: t.code,
      name: t.fullName,
      headline: t.headline,
      expertise: t.expertise,
      languages: t.languages,
      organisation: t.organisation,
      programmes: db.trainerProgrammes
        .filter((a) => a.trainerId === t.id)
        .flatMap((a) => {
          const code = programmes.get(a.programmeId)?.code
          return code ? [code] : []
        })
        .sort(),
    }))
}

export function attemptRows() {
  const assessments = indexBy(db.assessments, (a) => a.id)
  return db.assessmentAttempts.flatMap((attempt) => {
    const assessment = assessments.get(attempt.assessmentId)
    if (!assessment) return []
    return [
      {
        id: attempt.id,
        enrolmentId: attempt.enrolmentId,
        title: assessment.title,
        kind: assessment.kind,
        version: assessment.version,
        passPercent: assessment.passPercent,
        attemptNo: attempt.attemptNo,
        status: attempt.status,
        score: attempt.score,
        submittedAt: attempt.submittedAt,
        language: attempt.snapshot?.items[0]?.language ?? ('en' as const),
      },
    ]
  })
}

export function submissionRows() {
  const assignments = indexBy(db.assignments, (a) => a.id)
  const trainers = indexBy(db.trainerProfiles, (t) => t.id)
  // Final reviews only: draft marks belong to their marker.
  const reviews = indexBy(
    db.reviews.filter((r) => r.status !== 'draft'),
    (r) => r.submissionId,
  )
  return db.submissions.flatMap((s) => {
    const assignment = assignments.get(s.assignmentId)
    if (!assignment) return []
    const marker = s.markerTrainerId ? trainers.get(s.markerTrainerId) : undefined
    const review = reviews.get(s.id)
    return [
      {
        id: s.id,
        enrolmentId: s.enrolmentId,
        assignment: assignment.title,
        assignmentCode: assignment.code,
        version: s.version,
        status: s.status,
        submittedAt: s.submittedAt,
        wordCount: s.wordCount,
        marker: marker?.fullName ?? null,
        markerCode: marker?.code ?? null,
        score: review?.rubricScore ?? null,
        feedback: review?.feedback ?? null,
        reviewedAt: review?.reviewedAt ?? null,
      },
    ]
  })
}

export function certificateRows() {
  const programmes = indexBy(db.programmes, (p) => p.id)
  const profiles = indexBy(db.profiles, (p) => p.userId)
  return db.certificates.flatMap((c) => {
    const programme = programmes.get(c.programmeId)
    const profile = profiles.get(c.learnerId)
    if (!programme || !profile) return []
    return [
      {
        id: c.id,
        code: c.code,
        enrolmentId: c.enrolmentId,
        programme: programme.code,
        learnerName: c.learnerName,
        learnerCode: profile.learnerCode,
        status: c.status,
        issuedAt: c.issuedAt,
        revokedAt: c.revokedAt,
        revokeReason: c.revokeReason,
        evidence: c.evidence,
      },
    ]
  })
}

export function notificationRows() {
  const sessions = indexBy(db.sessions, (s) => s.id)
  const users = indexBy(db.users, (u) => u.id)
  return db.notifications.map((n) => {
    const session = n.sessionId ? sessions.get(n.sessionId) : undefined
    const actor = n.actorId ? users.get(n.actorId) : undefined
    return {
      eventId: n.eventId,
      kind: n.kind,
      channel: n.channel,
      state: n.state,
      recipientId: n.recipientId,
      subject: n.subject,
      createdAt: n.createdAt,
      sessionCode: session?.code ?? null,
      sessionTitle: session?.title ?? null,
      actorName: actor?.name ?? null,
      actorRole: actor?.role ?? null,
    }
  })
}

/** Export audit events, newest first. */
export function exportEvents() {
  return db.auditEvents.filter((e) => e.action.startsWith('export.')).sort(byNewest)
}
