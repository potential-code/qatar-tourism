/**
 * Roles, shared by both sides.
 *
 * The server stores and enforces them; the client only reads them to decide what to show.
 * Hiding a button is never the permission check — the route's middleware is.
 */
export const ROLES = ['user', 'admin'] as const

export type Role = (typeof ROLES)[number]

export const DEFAULT_ROLE: Role = 'user'
