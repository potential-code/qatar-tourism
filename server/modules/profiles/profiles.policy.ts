import { HttpError } from '@server/lib/errors'
import type { Role } from '@shared/roles'

/**
 * Profile access (brief §4, §11 "View profile and learning: learner, own only").
 *
 * Own-profile endpoints take no id: the service reads the caller's user id, so one learner can
 * never address another learner's profile. Trainers and admins have no learner profile and see
 * learner data through their own scoped modules (reports, rosters).
 */
export const OWN_PROFILE_ROLES: readonly Role[] = ['learner']

/** Facilitator quick switch: the demo administrator only (brief §3). */
export function assertFacilitator(adminId: string | null): asserts adminId is string {
  if (!adminId)
    throw HttpError.forbidden('The demo toolbar is available to the demo administrator only')
}
