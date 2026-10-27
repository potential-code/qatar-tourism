import { db } from '@server/db/connection'
import { finalReviewOfSubmission } from '@server/db/review-filters'
import {
  assessmentAttempts,
  assessments,
  attendance,
  certificates,
  courses,
  enrolments,
  learningPaths,
  organisations,
  pathVersions,
  profiles,
  programmes,
  reviews,
  rolePlayAttempts,
  rsvps,
  sessionScores,
  sessions,
  submissions,
  trainerProfiles,
  unitProgress,
} from '@server/db/schema'
import { now } from '@server/lib/clock'
import { count, eq } from 'drizzle-orm'
import type { AttemptFact, EnrolmentFact, Facts } from './analytics.types'

/**
 * The only place the metric layer reads the database. It loads every enrolment once, with the
 * evidence the governed metrics need, and returns plain facts. The dataset is small (about 1,260
 * enrolments), so one consistent read beats a dozen bespoke aggregate queries that could drift.
 */
export async function loadFacts(): Promise<Facts> {
  const [
    base,
    attempts,
    units,
    plays,
    subs,
    certs,
    sessionRows,
    rsvpCounts,
    attendanceRows,
    draftScores,
    trainers,
  ] = await Promise.all([
    db
      .select({
        enrolmentId: enrolments.id,
        learnerId: enrolments.learnerId,
        programme: programmes.code,
        status: enrolments.status,
        pathId: enrolments.pathId,
        pathName: learningPaths.name,
        pathVersion: pathVersions.version,
        currentStage: enrolments.currentStage,
        progress: enrolments.progressPercent,
        enrolledAt: enrolments.enrolledAt,
        startedAt: enrolments.startedAt,
        completedAt: enrolments.completedAt,
        lastActivityAt: enrolments.lastActivityAt,
        learnerCode: profiles.learnerCode,
        learnerName: profiles.fullName,
        registeredAt: profiles.registeredAt,
        organisationId: profiles.organisationId,
        organisationName: organisations.name,
        organisationType: organisations.type,
        jobTitle: profiles.jobTitle,
        jobFunction: profiles.jobFunction,
        seniority: profiles.seniority,
        suspended: profiles.suspended,
      })
      .from(enrolments)
      .innerJoin(programmes, eq(programmes.id, enrolments.programmeId))
      .innerJoin(profiles, eq(profiles.userId, enrolments.learnerId))
      .leftJoin(organisations, eq(organisations.id, profiles.organisationId))
      .leftJoin(learningPaths, eq(learningPaths.id, enrolments.pathId))
      .leftJoin(pathVersions, eq(pathVersions.id, enrolments.pathVersionId))
      .orderBy(profiles.learnerCode, programmes.code),
    db
      .select({
        enrolmentId: assessmentAttempts.enrolmentId,
        kind: assessments.kind,
        version: assessments.version,
        attemptNo: assessmentAttempts.attemptNo,
        score: assessmentAttempts.score,
        submittedAt: assessmentAttempts.submittedAt,
        competencyScores: assessmentAttempts.competencyScores,
      })
      .from(assessmentAttempts)
      .innerJoin(assessments, eq(assessments.id, assessmentAttempts.assessmentId))
      .where(eq(assessmentAttempts.status, 'submitted')),
    db
      .select({ enrolmentId: unitProgress.enrolmentId, course: courses.code })
      .from(unitProgress)
      .innerJoin(courses, eq(courses.id, unitProgress.courseId))
      .where(eq(unitProgress.status, 'completed')),
    db.selectDistinct({ enrolmentId: rolePlayAttempts.enrolmentId }).from(rolePlayAttempts),
    db
      .select({
        id: submissions.id,
        enrolmentId: submissions.enrolmentId,
        status: submissions.status,
        version: submissions.version,
        submittedAt: submissions.submittedAt,
        markerTrainerId: submissions.markerTrainerId,
        reviewScore: reviews.rubricScore,
      })
      .from(submissions)
      .leftJoin(reviews, finalReviewOfSubmission),
    db
      .select({ enrolmentId: certificates.enrolmentId })
      .from(certificates)
      .where(eq(certificates.status, 'issued')),
    db
      .select({
        sessionId: sessions.id,
        code: sessions.code,
        title: sessions.title,
        programme: programmes.code,
        trainerId: sessions.trainerId,
        trainerCode: trainerProfiles.code,
        trainerName: trainerProfiles.fullName,
        format: sessions.format,
        status: sessions.status,
        startsAt: sessions.startsAt,
        endsAt: sessions.endsAt,
        capacity: sessions.capacity,
        venue: sessions.venue,
        room: sessions.room,
      })
      .from(sessions)
      .innerJoin(programmes, eq(programmes.id, sessions.programmeId))
      .innerJoin(trainerProfiles, eq(trainerProfiles.id, sessions.trainerId))
      .orderBy(sessions.startsAt),
    db
      .select({ sessionId: rsvps.sessionId, status: rsvps.status, n: count() })
      .from(rsvps)
      .groupBy(rsvps.sessionId, rsvps.status),
    db
      .select({
        sessionId: attendance.sessionId,
        learnerId: attendance.learnerId,
        programme: programmes.code,
        format: sessions.format,
        status: attendance.status,
        sessionStatus: sessions.status,
        startsAt: sessions.startsAt,
      })
      .from(attendance)
      .innerJoin(sessions, eq(sessions.id, attendance.sessionId))
      .innerJoin(programmes, eq(programmes.id, sessions.programmeId)),
    db
      .select({
        sessionId: sessionScores.sessionId,
        trainerId: sessions.trainerId,
        updatedAt: sessionScores.updatedAt,
      })
      .from(sessionScores)
      .innerJoin(sessions, eq(sessions.id, sessionScores.sessionId))
      .where(eq(sessionScores.status, 'draft')),
    db
      .select({
        id: trainerProfiles.id,
        code: trainerProfiles.code,
        name: trainerProfiles.fullName,
      })
      .from(trainerProfiles)
      .orderBy(trainerProfiles.code),
  ])

  const latest = new Map<string, AttemptFact>()
  for (const row of attempts) {
    if (row.score === null) continue
    const key = `${row.enrolmentId}:${row.kind}`
    const prev = latest.get(key)
    if (prev && prev.attemptNo >= row.attemptNo) continue
    latest.set(key, {
      score: row.score,
      version: row.version,
      attemptNo: row.attemptNo,
      submittedAt: row.submittedAt,
      competencyScores: row.competencyScores ?? null,
    })
  }

  const unitsBy = new Map<string, Set<string>>()
  for (const row of units) {
    const set = unitsBy.get(row.enrolmentId) ?? new Set<string>()
    set.add(row.course)
    unitsBy.set(row.enrolmentId, set)
  }
  const played = new Set(plays.map((row) => row.enrolmentId))
  const certified = new Set(certs.map((row) => row.enrolmentId))

  const latestSubmission = new Map<string, EnrolmentFact['submission']>()
  for (const row of subs) {
    const prev = latestSubmission.get(row.enrolmentId)
    if (prev && prev.version >= row.version) continue
    latestSubmission.set(row.enrolmentId, {
      id: row.id,
      status: row.status,
      version: row.version,
      submittedAt: row.submittedAt,
      markerTrainerId: row.markerTrainerId,
      reviewScore: row.reviewScore ?? null,
    })
  }

  const enrolmentFacts: EnrolmentFact[] = base.map((row) => ({
    ...row,
    pathVersion: row.pathVersion ?? null,
    organisationType: row.organisationType ?? null,
    pre: latest.get(`${row.enrolmentId}:pre`) ?? null,
    post: latest.get(`${row.enrolmentId}:post`) ?? null,
    foundation: latest.get(`${row.enrolmentId}:formative`) ?? null,
    completedUnits: unitsBy.get(row.enrolmentId) ?? new Set<string>(),
    hasRolePlay: played.has(row.enrolmentId),
    submission: latestSubmission.get(row.enrolmentId) ?? null,
    certificateIssued: certified.has(row.enrolmentId),
  }))

  const counts = new Map<string, { confirmed: number; waitlisted: number }>()
  for (const row of rsvpCounts) {
    const entry = counts.get(row.sessionId) ?? { confirmed: 0, waitlisted: 0 }
    if (row.status === 'confirmed') entry.confirmed += row.n
    if (row.status === 'waitlisted') entry.waitlisted += row.n
    counts.set(row.sessionId, entry)
  }

  return {
    enrolments: enrolmentFacts,
    sessions: sessionRows.map((row) => ({
      ...row,
      confirmed: counts.get(row.sessionId)?.confirmed ?? 0,
      waitlisted: counts.get(row.sessionId)?.waitlisted ?? 0,
    })),
    attendance: attendanceRows,
    draftScores,
    trainers,
    asOf: now(),
  }
}

/** Options for the Dashboard and Reports filter selects (brief §12 top filters). */
export async function listFilterOptions() {
  const [orgs, paths] = await Promise.all([
    db
      .select({ id: organisations.id, name: organisations.name, type: organisations.type })
      .from(organisations)
      .orderBy(organisations.name),
    db
      .select({ id: learningPaths.id, name: learningPaths.name, programme: programmes.code })
      .from(learningPaths)
      .innerJoin(programmes, eq(programmes.id, learningPaths.programmeId))
      .orderBy(programmes.code, learningPaths.name),
  ])
  return { organisations: orgs, paths }
}
