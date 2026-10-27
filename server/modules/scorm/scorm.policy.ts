import type { Role } from '@shared/roles'

/** The SCORM runtime stores the signed-in learner's own attempt only (brief §8, §11). */
export const scormPingRoles: readonly Role[] = ['learner', 'trainer', 'admin']
export const scormLearnerRoles: readonly Role[] = ['learner']
