import { HttpError } from '@server/lib/errors'
import { type Action, accessFor, EXPORT_BLOCKED_MESSAGE } from '@shared/permissions'
import { ROLES, type Role } from '@shared/roles'

export const exportsPingRoles: readonly Role[] = ROLES

/** The §11 blocked-export answer, verbatim. */
export const exportBlocked = () => new HttpError(403, 'EXPORT_BLOCKED', EXPORT_BLOCKED_MESSAGE)

/**
 * Brief §11 export rows:
 *   personal data  learner no, trainer BLOCKED, admin permitted report scope
 *   marks          learner own, trainer learner ID and score only, admin authorised reports
 * Learners have no session-level export, so only trainer and admin reach a session export.
 */
export function exportAllowed(role: Role, kind: 'personal' | 'marks'): boolean {
  const action: Action = kind === 'personal' ? 'export.personal' : 'export.marks'
  if (role === 'learner') return false
  return accessFor(role, action) !== 'none'
}
