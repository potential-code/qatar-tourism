import type { Role } from '@shared/roles'

/**
 * Progress endpoints act on the signed-in learner's own enrolments only (brief §11 "Own only").
 * The learner id always comes from the session, never from the request.
 */
export const progressPingRoles: readonly Role[] = ['learner', 'trainer', 'admin']
export const progressLearnerRoles: readonly Role[] = ['learner']
