/**
 * Roles, shared by both sides.
 *
 * The server stores and enforces them; the client only reads them to decide what to show.
 * Hiding a button is never the permission check — the route's middleware is (brief §11).
 * Public registration always creates a learner; trainer and admin accounts are pre-provisioned.
 */
export const ROLES = ['learner', 'trainer', 'admin'] as const

export type Role = (typeof ROLES)[number]

export const DEFAULT_ROLE: Role = 'learner'

/** Where each role lands after sign-in (brief §3 routing rules). */
export const ROLE_HOME: Record<Role, string> = {
  learner: '/learner',
  trainer: '/trainer',
  admin: '/admin',
}
