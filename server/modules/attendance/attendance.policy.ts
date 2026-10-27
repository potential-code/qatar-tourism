import { ROLES, type Role } from '@shared/roles'

export const attendancePingRoles: readonly Role[] = ROLES

/** Brief §11 `marking.record`: trainers for assigned sessions, admins to review and administer. */
export const MARKING_ROLES: Role[] = ['trainer', 'admin']
