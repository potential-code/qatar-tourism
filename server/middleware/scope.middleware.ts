import { db } from '@server/db/connection'
import { rsvps, sessions, submissions, trainerProfiles } from '@server/db/schema'
import { HttpError } from '@server/lib/errors'
import { eq } from 'drizzle-orm'
import { createMiddleware } from 'hono/factory'
import type { AuthEnv } from './auth.middleware'

/**
 * Data scope of the viewer (brief §10–11: "Trainer 1 must not retrieve Trainer 2's roster by
 * changing an ID"). `requireRole` answers "may this role call the endpoint"; scope answers "may
 * this person see THIS record".
 *
 *   all      admin: Academy-wide, within permissions.ts
 *   trainer  a trainer: their own sessions, the learners booked on them, submissions assigned
 *   self     a learner: their own records
 *
 * Usage in a route: `.use(requireAuth, requireRole('trainer', 'admin'), withScope)`, then in the
 * controller pass `c.var.scope` to the service, which calls an `assert...InScope` helper next to
 * its query. A record outside the scope is a 403 (the trainer already knows IDs from their own
 * lists, so 404 would not hide anything).
 */
export type Scope =
  | { kind: 'all'; userId: string }
  | { kind: 'trainer'; userId: string; trainerId: string }
  | { kind: 'self'; userId: string }

export type ScopeEnv = AuthEnv & { Variables: { scope: Scope } }

export async function resolveScope(viewer: AuthEnv['Variables']['viewer']): Promise<Scope> {
  if (viewer.role === 'admin') return { kind: 'all', userId: viewer.id }
  if (viewer.role === 'learner') return { kind: 'self', userId: viewer.id }
  const [trainer] = await db
    .select({ id: trainerProfiles.id })
    .from(trainerProfiles)
    .where(eq(trainerProfiles.userId, viewer.id))
    .limit(1)
  // A trainer-role account without a trainer profile has no assigned data at all.
  if (!trainer) throw HttpError.forbidden('No trainer profile is linked to this account')
  return { kind: 'trainer', userId: viewer.id, trainerId: trainer.id }
}

/** Use after `requireAuth`. Puts the resolved scope on the context as `c.var.scope`. */
export const withScope = createMiddleware<ScopeEnv>(async (c, next) => {
  c.set('scope', await resolveScope(c.var.viewer))
  await next()
})

/** Admin passes; a trainer passes only for a session assigned to them. */
export async function assertSessionInScope(scope: Scope, sessionId: string): Promise<void> {
  if (scope.kind === 'all') return
  if (scope.kind === 'self') throw HttpError.forbidden()
  const [row] = await db
    .select({ trainerId: sessions.trainerId })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1)
  if (!row) throw HttpError.notFound('Session not found')
  if (row.trainerId !== scope.trainerId) throw HttpError.forbidden()
}

/** Ids of the learners (user ids) a trainer may see: booked on their sessions or marked by them. */
export async function assignedLearnerIds(scope: Scope): Promise<string[] | 'all'> {
  if (scope.kind === 'all') return 'all'
  if (scope.kind === 'self') return [scope.userId]
  const [booked, marked] = await Promise.all([
    db
      .select({ learnerId: rsvps.learnerId })
      .from(rsvps)
      .innerJoin(sessions, eq(sessions.id, rsvps.sessionId))
      .where(eq(sessions.trainerId, scope.trainerId)),
    db
      .select({ learnerId: submissions.learnerId })
      .from(submissions)
      .where(eq(submissions.markerTrainerId, scope.trainerId)),
  ])
  return [...new Set([...booked, ...marked].map((row) => row.learnerId))]
}

export async function assertLearnerInScope(scope: Scope, learnerUserId: string): Promise<void> {
  if (scope.kind === 'all') return
  if (scope.kind === 'self') {
    if (scope.userId !== learnerUserId) throw HttpError.forbidden()
    return
  }
  const allowed = await assignedLearnerIds(scope)
  if (allowed === 'all' || !allowed.includes(learnerUserId)) throw HttpError.forbidden()
}

/** A trainer may mark only submissions assigned to them. */
export async function assertSubmissionInScope(scope: Scope, submissionId: string): Promise<void> {
  if (scope.kind === 'all') return
  if (scope.kind === 'self') throw HttpError.forbidden()
  const [row] = await db
    .select({ marker: submissions.markerTrainerId })
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1)
  if (!row) throw HttpError.notFound('Submission not found')
  if (row.marker !== scope.trainerId) throw HttpError.forbidden()
}
