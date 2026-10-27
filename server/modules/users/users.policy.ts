import type { Role } from '@shared/roles'

/** Academy user management is admin only (brief §11, "Manage permissions"). */
export const USER_ADMIN_ROLES: readonly Role[] = ['admin']
