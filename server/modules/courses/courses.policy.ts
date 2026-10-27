import type { Role } from '@shared/roles'

/** Units are read in the context of the learner's own enrolment (brief §7, §11). */
export const coursesPingRoles: readonly Role[] = ['learner', 'trainer', 'admin']
export const coursesLearnerRoles: readonly Role[] = ['learner']
