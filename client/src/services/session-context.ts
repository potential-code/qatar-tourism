import { type Action, can } from '@shared/permissions'
import type { Role } from '@shared/roles'
import type { UserRow } from '@shared/types/db'
import { ApiError } from '@/lib/api-error'
import { db } from '@/mocks/db'

/**
 * Who is calling (formerly the auth middleware). A service resolves the signed-in user itself
 * with `requireUser` / `requireRole` / `requireCapability`, as wep-mockup's services do.
 */

/** The signed-in user as services see it (the old `c.var.viewer`). */
export type Viewer = Pick<UserRow, 'id' | 'name' | 'email' | 'role' | 'image'>

/** The signed-in account, or null. */
export function currentUser(): UserRow | null {
  const id = db.session?.userId
  return id ? (db.users.find((u) => u.id === id) ?? null) : null
}

/** 401 when nobody is signed in. */
export function requireUser(): UserRow {
  const user = currentUser()
  if (!user) throw ApiError.unauthorized()
  return user
}

/** 401 when signed out, 403 when the role is not one of `roles` (the old `requireRole`). */
export function requireRole(...roles: Role[]): UserRow {
  const user = requireUser()
  if (!roles.includes(user.role)) throw ApiError.forbidden()
  return user
}

/** 403 unless the permission matrix (shared/permissions.ts) allows `action` for the role. */
export function requireCapability(action: Action): UserRow {
  const user = requireUser()
  if (!can(user.role, action)) throw ApiError.forbidden()
  return user
}
