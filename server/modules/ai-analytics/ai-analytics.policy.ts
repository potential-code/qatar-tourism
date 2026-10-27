import { ROLES, type Role } from '@shared/roles'

/**
 * Roles that may reach the ai-analytics module. Phase 2 replaces this with per-action checks built on
 * `can()` and `accessFor()` from shared/permissions.ts (brief §11).
 */
export const aiAnalyticsPingRoles: readonly Role[] = ROLES
