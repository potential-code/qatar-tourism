import { ROLES, type Role } from '@shared/roles'

/**
 * Roles that may reach the profiles module. Phase 2 replaces this with per-action checks built on
 * `can()` and `accessFor()` from shared/permissions.ts (brief §11).
 */
export const profilesPingRoles: readonly Role[] = ROLES
