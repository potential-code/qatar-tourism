import { ROLES, type Role } from '@shared/roles'

/**
 * Organisation search returns fictional reference data only (brief §4, §15), never learner
 * records. Any signed-in role may read it: learners for the profile wizard, staff for filters.
 */
export const ORGANISATION_READ_ROLES: readonly Role[] = ROLES
