import { ApiError } from '@/lib/api-error'
import { db } from '@/mocks/db'
import { requireRole } from './session-context'

/**
 * Data scope of the viewer (brief §10–11: "Trainer 1 must not retrieve Trainer 2's roster by
 * changing an ID"), formerly server/middleware/scope.middleware.ts. `requireRole` answers "may
 * this role call the service"; scope answers "may this person see THIS record".
 *
 *   all      admin: Academy-wide, within permissions.ts
 *   trainer  a trainer: their own sessions, the learners booked on them, submissions assigned
 *   self     a learner: their own records
 *
 * A record outside the scope is a 403 (the trainer already knows IDs from their own lists).
 */
export type Scope =
  | { kind: 'all'; userId: string }
  | { kind: 'trainer'; userId: string; trainerId: string }
  | { kind: 'self'; userId: string }

/** The signed-in user's scope. 403 for a trainer account without a trainer profile. */
export function currentScope(): Scope {
  const user = requireRole('learner', 'trainer', 'admin')
  if (user.role === 'admin') return { kind: 'all', userId: user.id }
  if (user.role === 'learner') return { kind: 'self', userId: user.id }
  const trainer = db.trainerProfiles.find((t) => t.userId === user.id)
  if (!trainer) throw ApiError.forbidden('No trainer profile is linked to this account')
  return { kind: 'trainer', userId: user.id, trainerId: trainer.id }
}

/** Admin passes; a trainer passes only for a session assigned to them. */
export function assertSessionInScope(scope: Scope, sessionId: string): void {
  if (scope.kind === 'all') return
  if (scope.kind === 'self') throw ApiError.forbidden()
  const session = db.sessions.find((s) => s.id === sessionId)
  if (!session) throw ApiError.notFound('Session not found')
  if (session.trainerId !== scope.trainerId) throw ApiError.forbidden()
}

/** User ids of the learners a trainer may see: booked on their sessions or marked by them. */
export function assignedLearnerIds(scope: Scope): string[] | 'all' {
  if (scope.kind === 'all') return 'all'
  if (scope.kind === 'self') return [scope.userId]
  const own = new Set(db.sessions.filter((s) => s.trainerId === scope.trainerId).map((s) => s.id))
  const booked = db.rsvps.filter((r) => own.has(r.sessionId)).map((r) => r.learnerId)
  const marked = db.submissions
    .filter((s) => s.markerTrainerId === scope.trainerId)
    .map((s) => s.learnerId)
  return [...new Set([...booked, ...marked])]
}

export function assertLearnerInScope(scope: Scope, learnerUserId: string): void {
  if (scope.kind === 'all') return
  if (scope.kind === 'self') {
    if (scope.userId !== learnerUserId) throw ApiError.forbidden()
    return
  }
  const allowed = assignedLearnerIds(scope)
  if (allowed === 'all' || !allowed.includes(learnerUserId)) throw ApiError.forbidden()
}

/** A trainer may mark only submissions assigned to them. */
export function assertSubmissionInScope(scope: Scope, submissionId: string): void {
  if (scope.kind === 'all') return
  if (scope.kind === 'self') throw ApiError.forbidden()
  const submission = db.submissions.find((s) => s.id === submissionId)
  if (!submission) throw ApiError.notFound('Submission not found')
  if (submission.markerTrainerId !== scope.trainerId) throw ApiError.forbidden()
}
