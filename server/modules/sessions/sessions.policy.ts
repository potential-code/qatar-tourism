import { db } from '@server/db/connection'
import { trainerProgrammes } from '@server/db/schema'
import { HttpError } from '@server/lib/errors'
import type { Scope } from '@server/middleware/scope.middleware'
import { ROLES, type Role } from '@shared/roles'
import { and, eq } from 'drizzle-orm'

/**
 * Session permissions (brief §10–11): a trainer creates sessions for themselves in the
 * programmes they are approved for and manages only their own sessions. Programme reassignment
 * and another trainer's session need an admin. Enforced here, server side.
 */
export const sessionsPingRoles: readonly Role[] = ROLES
export const SESSION_MANAGER_ROLES: Role[] = ['trainer', 'admin']
export const TRAINER_ONLY: Role[] = ['trainer']

export async function trainerApprovedFor(trainerId: string, programmeId: string) {
  const [row] = await db
    .select({ id: trainerProgrammes.id })
    .from(trainerProgrammes)
    .where(
      and(
        eq(trainerProgrammes.trainerId, trainerId),
        eq(trainerProgrammes.programmeId, programmeId),
      ),
    )
    .limit(1)
  return Boolean(row)
}

export async function assertCanCreate(
  scope: Scope,
  input: { trainerId: string; programmeId: string },
) {
  if (scope.kind === 'all') return
  if (scope.kind !== 'trainer') throw HttpError.forbidden()
  if (input.trainerId !== scope.trainerId) {
    throw HttpError.forbidden('Only an admin can create a session for another trainer.')
  }
  if (!(await trainerApprovedFor(scope.trainerId, input.programmeId))) {
    throw HttpError.forbidden(
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
    throw HttpError.forbidden('Programme reassignment requires an admin.')
  }
  if (next.trainerId !== current.trainerId) {
    throw HttpError.forbidden('Assigning a session to another trainer requires an admin.')
  }
}
