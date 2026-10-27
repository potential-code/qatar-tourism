import type { Role } from '@shared/roles'

/**
 * Simulated AI practice is a learner activity on the learner's own enrolments (brief §9, §11
 * "Own only"). Trainers and admins never call these endpoints; ownership of each attempt and
 * enrolment is checked in the service, next to the query.
 */
export const PRACTICE_ROLES: readonly Role[] = ['learner']
