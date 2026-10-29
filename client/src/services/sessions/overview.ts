import { ApiError, assignedLearnerIds, db, now, type Scope } from '../api'
import { outstandingAttendanceBySession } from './outstanding'
import { ms, selectSessionCards } from './store'
import { toSessionView } from './view'

/**
 * Trainer Overview (brief §10): upcoming sessions, assigned learners, attendance outstanding,
 * marking queue, reschedule requests and recent feedback. Everything is computed from rows in
 * the trainer's own scope, so the numbers move as the walkthrough changes data.
 */

const iso = (value: string) => new Date(value).toISOString()
const byNewest =
  <T>(at: (row: T) => string) =>
  (a: T, b: T) =>
    ms(at(b)) - ms(at(a))

/** Late change requests raised on the trainer's sessions, newest first. */
function changeRequestsFor(trainerId: string) {
  const sessions = new Map(db.sessions.map((s) => [s.id, s]))
  const profiles = new Map(db.profiles.map((p) => [p.userId, p]))
  return db.auditEvents
    .filter((e) => e.action === 'rsvp.change_requested')
    .flatMap((e) => {
      const session = sessions.get(String(e.after?.sessionId ?? ''))
      if (!session || session.trainerId !== trainerId) return []
      return [
        {
          id: e.id,
          reason: e.reason,
          createdAt: iso(e.createdAt),
          kind: (e.after?.kind as string | undefined) ?? null,
          sessionCode: session.code,
          sessionTitle: session.title,
          learnerCode: (e.actorId ? profiles.get(e.actorId)?.learnerCode : null) ?? 'Learner',
        },
      ]
    })
    .sort(byNewest((r) => r.createdAt))
    .slice(0, 5)
}

function reschedulesFor(trainerId: string) {
  const sessions = new Map(db.sessions.map((s) => [s.id, s]))
  return db.sessionReschedules
    .flatMap((r) => {
      const session = sessions.get(r.sessionId)
      if (!session || session.trainerId !== trainerId) return []
      return [
        {
          id: r.id,
          sessionCode: session.code,
          sessionTitle: session.title,
          previousStartsAt: iso(r.previousStartsAt),
          newStartsAt: iso(r.newStartsAt),
          reason: r.reason,
          affected: r.affectedRsvps,
          at: iso(r.createdAt),
        },
      ]
    })
    .sort(byNewest((r) => r.at))
    .slice(0, 5)
}

function feedbackFor(trainerId: string) {
  const sessions = new Map(db.sessions.map((s) => [s.id, s]))
  const profiles = new Map(db.profiles.map((p) => [p.userId, p]))
  return db.sessionScores
    .flatMap((score) => {
      const session = sessions.get(score.sessionId)
      if (!session || session.trainerId !== trainerId || score.feedback === null) return []
      const profile = profiles.get(score.learnerId)
      return [
        {
          id: score.id,
          total: score.total,
          status: score.status,
          feedback: score.feedback,
          updatedAt: iso(score.updatedAt),
          learnerCode: profile?.learnerCode ?? 'Learner',
          displayName: profile?.fullName ?? 'Learner',
          sessionTitle: session.title,
        },
      ]
    })
    .sort(byNewest((f) => f.updatedAt))
    .slice(0, 4)
}

export function trainerOverview(scope: Scope) {
  if (scope.kind !== 'trainer') throw ApiError.forbidden('The overview is for trainers.')
  const at = now()
  const { trainerId } = scope
  const profile = trainerProfile(scope)
  const cards = selectSessionCards((s) => s.trainerId === trainerId)
  const learners = assignedLearnerIds(scope)
  const ownSessions = new Set(cards.map((c) => c.session.id))
  const markingQueue = db.submissions.filter(
    (s) =>
      s.markerTrainerId === trainerId && (s.status === 'submitted' || s.status === 'under_review'),
  ).length
  const requests = changeRequestsFor(trainerId)
  const outstanding = outstandingAttendanceBySession([...ownSessions])
  const draftScores = db.sessionScores.filter(
    (s) => ownSessions.has(s.sessionId) && s.status === 'draft',
  ).length

  const upcoming = cards.filter(
    (card) => ms(card.session.startsAt) > at.getTime() && card.session.status !== 'cancelled',
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
      draftScores,
      markingQueue,
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
    requests,
    reschedules: reschedulesFor(trainerId),
    feedback: feedbackFor(trainerId),
  }
}

/** Trainer profile and approved programmes (brief §16). Fictional data. */
export function trainerProfile(scope: Scope) {
  if (scope.kind !== 'trainer') throw ApiError.forbidden('Only trainers have a trainer profile.')
  const profile = db.trainerProfiles.find((t) => t.id === scope.trainerId)
  if (!profile) throw ApiError.notFound('Trainer profile not found')
  const programmes = new Map(db.programmes.map((p) => [p.id, p]))
  const approved = db.trainerProgrammes
    .filter((t) => t.trainerId === scope.trainerId)
    .flatMap((t) => {
      const programme = programmes.get(t.programmeId)
      return programme ? [{ code: programme.code, title: programme.title }] : []
    })
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
    sessionsDelivered: db.sessions.filter(
      (s) => s.trainerId === scope.trainerId && s.status === 'completed',
    ).length,
  }
}

/** Session materials across the trainer's own non-cancelled sessions (Resources page). */
export function trainerResources(scope: Scope) {
  if (scope.kind !== 'trainer') throw ApiError.forbidden()
  const own = scope.trainerId
  const sessionMaterials = db.sessions
    .filter((s) => s.trainerId === own && s.status !== 'cancelled' && s.materials.length > 0)
    .sort((a, b) => ms(a.startsAt) - ms(b.startsAt))
    .map((s) => ({
      id: s.id,
      code: s.code,
      title: s.title,
      materials: s.materials,
      startsAt: iso(s.startsAt),
    }))
  const ownIds = new Set(db.sessions.filter((s) => s.trainerId === own).map((s) => s.id))
  const confirmedLearners = db.rsvps.filter(
    (r) => ownIds.has(r.sessionId) && r.status === 'confirmed',
  ).length
  return { sessionMaterials, confirmedLearners }
}
