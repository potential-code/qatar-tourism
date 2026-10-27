import type { Role } from '@shared/roles'

/**
 * Changing paths, rules and path overrides is admin only, with an audit trail
 * (shared/permissions.ts 'path.change': "Yes with audit trail").
 */
export const PATH_ADMIN_ROLES: readonly Role[] = ['admin']
