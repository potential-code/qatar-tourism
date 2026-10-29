import { ApiError, db, type Scope } from '../api'

/**
 * Session permissions (brief §10–11, formerly sessions.policy.ts): a trainer creates sessions for
 * themselves in the programmes they are approved for and manages only their own sessions.
 * Programme reassignment and another trainer's session need an admin.
 */

export function trainerApprovedFor(trainerId: string, programmeId: string): boolean {
  return db.trainerProgrammes.some(
    (t) => t.trainerId === trainerId && t.programmeId === programmeId,
  )
}

export function assertCanCreate(scope: Scope, input: { trainerId: string; programmeId: string }) {
  if (scope.kind === 'all') return
  if (scope.kind !== 'trainer') throw ApiError.forbidden()
  if (input.trainerId !== scope.trainerId) {
    throw ApiError.forbidden('Only an admin can create a session for another trainer.')
  }
  if (!trainerApprovedFor(scope.trainerId, input.programmeId)) {
    throw ApiError.forbidden(
      'You are not approved to run sessions for this programme. Ask an admin to assign it.',
    )
  }
}

/** Called after `assertSessionInScope`: blocks the admin-only parts of an edit. */
export function assertEditAllowed(
  scope: Scope,
  current: { trainerId: string; programmeId: string },
  next: { trainerId: string; programmeId: string },
) {
  if (scope.kind === 'all') return
  if (next.programmeId !== current.programmeId) {
    throw ApiError.forbidden('Programme reassignment requires an admin.')
  }
  if (next.trainerId !== current.trainerId) {
    throw ApiError.forbidden('Assigning a session to another trainer requires an admin.')
  }
}
