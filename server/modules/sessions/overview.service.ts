import { db } from '@server/db/connection'
import {
  auditEvents,
  profiles,
  programmes,
  rsvps,
  sessionReschedules,
  sessionScores,
  sessions,
  submissions,
  trainerProfiles,
  trainerProgrammes,
} from '@server/db/schema'
import { now } from '@server/lib/clock'
import { HttpError } from '@server/lib/errors'
import { assignedLearnerIds, type Scope } from '@server/middleware/scope.middleware'
import { and, count, desc, eq, gt, inArray, isNotNull, ne, sql } from 'drizzle-orm'
import { selectSessionCards } from './session-store'
import { toSessionView } from './session-view'
import { outstandingAttendanceBySession } from './sessions.service'

/**
 * Trainer Overview (brief §10): upcoming sessions, assigned learners, attendance outstanding,
 * marking queue, reschedule requests and recent feedback. Everything is computed from rows in
 * the trainer's own scope, so the numbers move as the walkthrough changes data.
 */
export async function trainerOverview(scope: Scope) {
  if (scope.kind !== 'trainer') throw HttpError.forbidden('The overview is for trainers.')
  const at = now()
  const trainerId = scope.trainerId

  const [profile, cards, learners, markingQueue, requests, reschedules, feedback] =
    await Promise.all([
      trainerProfile(scope),
      selectSessionCards(eq(sessions.trainerId, trainerId)),
      assignedLearnerIds(scope),
      db
        .select({ total: count() })
        .from(submissions)
        .where(
          and(
            eq(submissions.markerTrainerId, trainerId),
            inArray(submissions.status, ['submitted', 'under_review']),
          ),
        ),
      db
        .select({
          id: auditEvents.id,
          reason: auditEvents.reason,
          createdAt: auditEvents.createdAt,
          kind: sql<string>`${auditEvents.after}->>'kind'`,
          sessionCode: sessions.code,
          sessionTitle: sessions.title,
          learnerCode: profiles.learnerCode,
        })
        .from(auditEvents)
        .innerJoin(sessions, sql`${sessions.id}::text = ${auditEvents.after}->>'sessionId'`)
        .leftJoin(profiles, eq(profiles.userId, auditEvents.actorId))
        .where(
          and(eq(auditEvents.action, 'rsvp.change_requested'), eq(sessions.trainerId, trainerId)),
        )
        .orderBy(desc(auditEvents.createdAt))
        .limit(5),
      db
        .select({
          id: sessionReschedules.id,
          sessionCode: sessions.code,
          sessionTitle: sessions.title,
          previousStartsAt: sessionReschedules.previousStartsAt,
          newStartsAt: sessionReschedules.newStartsAt,
          reason: sessionReschedules.reason,
          affected: sessionReschedules.affectedRsvps,
          at: sessionReschedules.createdAt,
        })
        .from(sessionReschedules)
        .innerJoin(sessions, eq(sessions.id, sessionReschedules.sessionId))
        .where(eq(sessions.trainerId, trainerId))
        .orderBy(desc(sessionReschedules.createdAt))
        .limit(5),
      db
        .select({
          id: sessionScores.id,
          total: sessionScores.total,
          status: sessionScores.status,
          feedback: sessionScores.feedback,
          updatedAt: sessionScores.updatedAt,
          learnerCode: profiles.learnerCode,
          displayName: profiles.fullName,
          sessionTitle: sessions.title,
        })
        .from(sessionScores)
        .innerJoin(sessions, eq(sessions.id, sessionScores.sessionId))
        .leftJoin(profiles, eq(profiles.userId, sessionScores.learnerId))
        .where(and(eq(sessions.trainerId, trainerId), isNotNull(sessionScores.feedback)))
        .orderBy(desc(sessionScores.updatedAt))
        .limit(4),
    ])

  const outstanding = await outstandingAttendanceBySession(cards.map((c) => c.session.id))
  const draftScores = await db
    .select({ total: count() })
    .from(sessionScores)
    .innerJoin(sessions, eq(sessions.id, sessionScores.sessionId))
    .where(and(eq(sessions.trainerId, trainerId), eq(sessionScores.status, 'draft')))

  const upcoming = cards.filter(
    (card) => card.session.startsAt > at && card.session.status !== 'cancelled',
  )
  const statusMix = ['draft', 'published', 'full', 'completed', 'cancelled'].map((status) => ({
    status,
    total: cards.filter((card) => card.session.status === status).length,
  }))

  return {
    now: at.toISOString(),
    profile,
    stats: {
      upcomingSessions: upcoming.length,
      assignedLearners: learners === 'all' ? 0 : learners.length,
      attendanceOutstanding: [...outstanding.values()].reduce((sum, n) => sum + n, 0),
      draftScores: draftScores[0]?.total ?? 0,
      markingQueue: markingQueue[0]?.total ?? 0,
      rescheduleRequests: requests.length,
      seatsBooked: upcoming.reduce((sum, card) => sum + card.confirmed, 0),
      seatsOffered: upcoming.reduce((sum, card) => sum + card.session.capacity, 0),
    },
    statusMix,
    upcoming: upcoming.slice(0, 4).map(toSessionView),
    needsMarking: cards
      .filter((card) => (outstanding.get(card.session.id) ?? 0) > 0)
      .map((card) => ({
        ...toSessionView(card),
        outstanding: outstanding.get(card.session.id) ?? 0,
      })),
    requests: requests.map((r) => ({
      ...r,
      learnerCode: r.learnerCode ?? 'Learner',
      createdAt: r.createdAt.toISOString(),
    })),
    reschedules: reschedules.map((r) => ({
      ...r,
      previousStartsAt: r.previousStartsAt.toISOString(),
      newStartsAt: r.newStartsAt.toISOString(),
      at: r.at.toISOString(),
    })),
    feedback: feedback.map((f) => ({
      ...f,
      learnerCode: f.learnerCode ?? 'Learner',
      displayName: f.displayName ?? 'Learner',
      updatedAt: f.updatedAt.toISOString(),
    })),
  }
}

/** Trainer profile and approved programmes (brief §16). Fictional data. */
export async function trainerProfile(scope: Scope) {
  if (scope.kind !== 'trainer') throw HttpError.forbidden('Only trainers have a trainer profile.')
  const [profile] = await db
    .select()
    .from(trainerProfiles)
    .where(eq(trainerProfiles.id, scope.trainerId))
  if (!profile) throw HttpError.notFound('Trainer profile not found')
  const approved = await db
    .select({ code: programmes.code, title: programmes.title })
    .from(trainerProgrammes)
    .innerJoin(programmes, eq(programmes.id, trainerProgrammes.programmeId))
    .where(eq(trainerProgrammes.trainerId, scope.trainerId))
  const [delivered] = await db
    .select({ total: count() })
    .from(sessions)
    .where(and(eq(sessions.trainerId, scope.trainerId), eq(sessions.status, 'completed')))
  return {
    id: profile.id,
    code: profile.code,
    fullName: profile.fullName,
    headline: profile.headline,
    bio: profile.bio,
    expertise: profile.expertise,
    languages: profile.languages,
    organisation: profile.organisation,
    avatarPath: profile.avatarPath,
    programmes: approved,
    sessionsDelivered: delivered?.total ?? 0,
  }
}

/** Session materials across the trainer's own non-cancelled sessions (Resources page). */
export async function trainerResources(scope: Scope) {
  if (scope.kind !== 'trainer') throw HttpError.forbidden()
  const rows = await db
    .select({
      id: sessions.id,
      code: sessions.code,
      title: sessions.title,
      materials: sessions.materials,
      startsAt: sessions.startsAt,
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.trainerId, scope.trainerId),
        ne(sessions.status, 'cancelled'),
        gt(sql`jsonb_array_length(${sessions.materials})`, 0),
      ),
    )
    .orderBy(sessions.startsAt)
  const confirmed = await db
    .select({ total: count() })
    .from(rsvps)
    .innerJoin(sessions, eq(sessions.id, rsvps.sessionId))
    .where(and(eq(sessions.trainerId, scope.trainerId), eq(rsvps.status, 'confirmed')))
  return {
    sessionMaterials: rows.map((row) => ({ ...row, startsAt: row.startsAt.toISOString() })),
    confirmedLearners: confirmed[0]?.total ?? 0,
  }
}
