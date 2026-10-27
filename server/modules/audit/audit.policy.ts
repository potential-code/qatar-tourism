import type { Role } from '@shared/roles'

/** Only administrators read the audit trail (shared/permissions.ts: 'audit.view'). */
export const AUDIT_VIEW_ROLES: readonly Role[] = ['admin']
