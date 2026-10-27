import { ROLES, type Role } from '@shared/roles'

/** Every signed-in role has a bell with its own notifications. */
export const notificationsPingRoles: readonly Role[] = ROLES
export const NOTIFICATION_INBOX_ROLES: readonly Role[] = ROLES

/** The delivery log of session notifications: trainers (own sessions) and admins (brief §11). */
export const NOTIFICATION_LOG_ROLES: Role[] = ['trainer', 'admin']
