import { ROLES, type Role } from '@shared/roles'

/**
 * Roles that may reach the scorm module. Phase 2 replaces this with per-action checks built on
 * `can()` and `accessFor()` from shared/permissions.ts (brief §11).
 */
export const scormPingRoles: readonly Role[] = ROLES
