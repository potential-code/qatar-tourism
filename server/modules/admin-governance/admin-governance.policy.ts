import type { Role } from '@shared/roles'

/** Roles, integrations and the audit trail are for an authorised admin only (brief §11). */
export const GOVERNANCE_ROLES: readonly Role[] = ['admin']
