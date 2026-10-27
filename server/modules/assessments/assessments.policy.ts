import type { Role } from '@shared/roles'

/** Learners take and read their own assessments only (brief §8, §11). */
export const assessmentsPingRoles: readonly Role[] = ['learner', 'trainer', 'admin']
export const assessmentsLearnerRoles: readonly Role[] = ['learner']
