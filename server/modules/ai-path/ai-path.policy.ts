import type { Role } from '@shared/roles'

/** The scripted path generator works on the signed-in learner's own enrolment only (brief §9). */
export const aiPathPingRoles: readonly Role[] = ['learner', 'trainer', 'admin']
export const aiPathLearnerRoles: readonly Role[] = ['learner']
