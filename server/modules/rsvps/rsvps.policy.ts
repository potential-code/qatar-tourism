import { ROLES, type Role } from '@shared/roles'

export const rsvpsPingRoles: readonly Role[] = ROLES

/** Booking is a learner action on their own records (brief §11 `rsvp.manage`: own). */
export const BOOKING_ROLES: Role[] = ['learner']
