import type { ProgrammeCode } from '@shared/constants'
import { db, indexBy, now } from '../api'
import type { AttemptFact, EnrolmentFact, Facts } from './types'

/**
 * The only place the metric layer reads the demo database (formerly analytics.service.ts
 * `loadFacts`). It reads every enrolment once, with the evidence the governed metrics need, and
 * returns plain facts with real `Date`s. About 1,260 enrolments, so one consistent read beats a
 * dozen bespoke aggregates that could drift apart.
 */

const date = (iso: string) => new Date(iso)
const dateOrNull = (iso: string | null | undefined) => (iso ? new Date(iso) : null)

/** Final reviews only: draft marks are visible to their marker, never to reports or KPIs. */
function finalReviewScores(): Map<string, number> {
  const scores = new Map<string, number>()
  for (const review of db.reviews) {
    if (review.status !== 'draft') scores.set(review.submissionId, review.rubricScore)
  }
  return scores
}

function latestAttempts(): Map<string, AttemptFact> {
  const kinds = indexBy(db.assessments, (a) => a.id)
  const latest = new Map<string, AttemptFact>()
  for (const row of db.assessmentAttempts) {
    if (row.status !== 'submitted' || row.score === null) continue
    const assessment = kinds.get(row.assessmentId)
    if (!assessment) continue
    const key = `${row.enrolmentId}:${assessment.kind}`
    const prev = latest.get(key)
    if (prev && prev.attemptNo >= row.attemptNo) continue
    latest.set(key, {
      score: row.score,
      version: assessment.version,
      attemptNo: row.attemptNo,
      submittedAt: dateOrNull(row.submittedAt),
      competencyScores: row.competencyScores ?? null,
    })
  }
  return latest
}

function enrolmentFacts(): EnrolmentFact[] {
  const programmes = indexBy(db.programmes, (p) => p.id)
  const profiles = indexBy(db.profiles, (p) => p.userId)
  const organisations = indexBy(db.organisations, (o) => o.id)
  const paths = indexBy(db.learningPaths, (p) => p.id)
  const versions = indexBy(db.pathVersions, (v) => v.id)
  const courses = indexBy(db.courses, (c) => c.id)
  const attempts = latestAttempts()
  const reviewScores = finalReviewScores()

  const unitsBy = new Map<string, Set<string>>()
  for (const row of db.unitProgress) {
    if (row.status !== 'completed') continue
    const code = courses.get(row.courseId)?.code
    if (!code) continue
    const set = unitsBy.get(row.enrolmentId) ?? new Set<string>()
    set.add(code)
    unitsBy.set(row.enrolmentId, set)
  }
  const played = new Set(db.rolePlayAttempts.map((row) => row.enrolmentId))
  const certified = new Set(
    db.certificates.filter((c) => c.status === 'issued').map((c) => c.enrolmentId),
  )
  const latestSubmission = new Map<string, EnrolmentFact['submission']>()
  for (const row of db.submissions) {
    const prev = latestSubmission.get(row.enrolmentId)
    if (prev && prev.version >= row.version) continue
    latestSubmission.set(row.enrolmentId, {
      id: row.id,
      status: row.status,
      version: row.version,
      submittedAt: date(row.submittedAt),
      markerTrainerId: row.markerTrainerId,
      reviewScore: reviewScores.get(row.id) ?? null,
    })
  }

  const facts: EnrolmentFact[] = []
  for (const row of db.enrolments) {
    const programme = programmes.get(row.programmeId)
    const profile = profiles.get(row.learnerId)
    if (!programme || !profile) continue
    const organisation = profile.organisationId ? organisations.get(profile.organisationId) : null
    const path = row.pathId ? paths.get(row.pathId) : null
    facts.push({
      enrolmentId: row.id,
      learnerId: row.learnerId,
      learnerCode: profile.learnerCode,
      learnerName: profile.fullName,
      programme: programme.code,
      status: row.status,
      pathId: row.pathId,
      pathName: path?.name ?? null,
      pathVersion: row.pathVersionId ? (versions.get(row.pathVersionId)?.version ?? null) : null,
      currentStage: row.currentStage,
      progress: row.progressPercent,
      enrolledAt: date(row.enrolledAt),
      startedAt: dateOrNull(row.startedAt),
      completedAt: dateOrNull(row.completedAt),
      lastActivityAt: dateOrNull(row.lastActivityAt),
      registeredAt: date(profile.registeredAt),
      organisationId: profile.organisationId,
      organisationName: organisation?.name ?? null,
      organisationType: organisation?.type ?? null,
      jobTitle: profile.jobTitle,
      jobFunction: profile.jobFunction,
      seniority: profile.seniority,
      suspended: profile.suspended,
      pre: attempts.get(`${row.id}:pre`) ?? null,
      post: attempts.get(`${row.id}:post`) ?? null,
      foundation: attempts.get(`${row.id}:formative`) ?? null,
      completedUnits: unitsBy.get(row.id) ?? new Set<string>(),
      hasRolePlay: played.has(row.id),
      submission: latestSubmission.get(row.id) ?? null,
      certificateIssued: certified.has(row.id),
    })
  }
  // The old query ordered by learner code, then programme code.
  return facts.sort(
    (a, b) => a.learnerCode.localeCompare(b.learnerCode) || a.programme.localeCompare(b.programme),
  )
}

export function loadFacts(): Facts {
  const programmes = indexBy(db.programmes, (p) => p.id)
  const trainers = indexBy(db.trainerProfiles, (t) => t.id)
  const sessionsById = indexBy(db.sessions, (s) => s.id)

  const counts = new Map<string, { confirmed: number; waitlisted: number }>()
  for (const rsvp of db.rsvps) {
    const entry = counts.get(rsvp.sessionId) ?? { confirmed: 0, waitlisted: 0 }
    if (rsvp.status === 'confirmed') entry.confirmed += 1
    if (rsvp.status === 'waitlisted') entry.waitlisted += 1
    counts.set(rsvp.sessionId, entry)
  }

  const sessions: Facts['sessions'] = []
  for (const s of db.sessions) {
    const programme = programmes.get(s.programmeId)
    const trainer = trainers.get(s.trainerId)
    if (!programme || !trainer) continue
    sessions.push({
      sessionId: s.id,
      code: s.code,
      title: s.title,
      programme: programme.code,
      trainerId: s.trainerId,
      trainerCode: trainer.code,
      trainerName: trainer.fullName,
      format: s.format,
      status: s.status,
      startsAt: date(s.startsAt),
      endsAt: date(s.endsAt),
      capacity: s.capacity,
      venue: s.venue,
      room: s.room,
      confirmed: counts.get(s.id)?.confirmed ?? 0,
      waitlisted: counts.get(s.id)?.waitlisted ?? 0,
    })
  }
  sessions.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())

  const attendance: Facts['attendance'] = []
  for (const a of db.attendance) {
    const session = sessionsById.get(a.sessionId)
    const programme = session ? programmes.get(session.programmeId) : undefined
    if (!session || !programme) continue
    attendance.push({
      sessionId: a.sessionId,
      learnerId: a.learnerId,
      programme: programme.code as ProgrammeCode,
      format: session.format,
      status: a.status,
      sessionStatus: session.status,
      startsAt: date(session.startsAt),
    })
  }

  const draftScores: Facts['draftScores'] = []
  for (const score of db.sessionScores) {
    const session = sessionsById.get(score.sessionId)
    if (score.status !== 'draft' || !session) continue
    draftScores.push({
      sessionId: score.sessionId,
      trainerId: session.trainerId,
      updatedAt: date(score.updatedAt),
    })
  }

  return {
    enrolments: enrolmentFacts(),
    sessions,
    attendance,
    draftScores,
    trainers: [...db.trainerProfiles]
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((t) => ({ id: t.id, code: t.code, name: t.fullName })),
    asOf: now(),
  }
}

/** Options for the Dashboard and Reports filter selects (brief §12 top filters). */
export function listFilterOptions() {
  const programmes = indexBy(db.programmes, (p) => p.id)
  const organisations = [...db.organisations]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((o) => ({ id: o.id, name: o.name, type: o.type }))
  const paths = db.learningPaths
    .flatMap((p) => {
      const programme = programmes.get(p.programmeId)
      return programme ? [{ id: p.id, name: p.name, programme: programme.code }] : []
    })
    .sort((a, b) => a.programme.localeCompare(b.programme) || a.name.localeCompare(b.name))
  return { organisations, paths }
}
