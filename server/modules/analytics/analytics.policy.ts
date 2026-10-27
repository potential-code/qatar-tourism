import type { Role } from '@shared/roles'

/**
 * Academy-wide analytics are admin only (shared/permissions.ts 'analytics.use': trainers have
 * "No Academy-wide access"). `/ping` stays open to any signed-in role for the Phase 1 stub test.
 */
export const ANALYTICS_ROLES: readonly Role[] = ['admin']
