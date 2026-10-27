import type { Role } from '@shared/roles'

/**
 * Who may reach each certificate action (brief §6, §11). Ownership is checked in the service:
 * a learner only ever sees their own certificate; revoke and reissue are admin only.
 */
export const certificatePingRoles: readonly Role[] = ['learner', 'trainer', 'admin']
export const certificateReadRoles: readonly Role[] = ['learner', 'admin']
export const certificateAdminRoles: readonly Role[] = ['admin']
