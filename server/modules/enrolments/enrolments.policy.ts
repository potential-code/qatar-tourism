import type { Role } from '@shared/roles'

/** Learners read and create their own enrolments only (brief §3, §11). */
export const enrolmentsPingRoles: readonly Role[] = ['learner', 'trainer', 'admin']
export const enrolmentsLearnerRoles: readonly Role[] = ['learner']
