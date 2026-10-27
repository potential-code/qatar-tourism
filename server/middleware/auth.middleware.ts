import { auth } from '@server/auth/auth'
import { HttpError } from '@server/lib/errors'
import { DEFAULT_ROLE, ROLES, type Role } from '@shared/roles'
import { createMiddleware } from 'hono/factory'

/** The signed-in user as the rest of the server sees it. */
export type Viewer = {
  id: string
  name: string
  email: string
  role: Role
}

export type AuthEnv = {
  Variables: {
    viewer: Viewer
  }
}

function toRole(value: unknown): Role {
  return ROLES.includes(value as Role) ? (value as Role) : DEFAULT_ROLE
}

/**
 * Resolves the session from the request cookies. Better Auth reads the session and the user
 * from the database on each call (cookie cache is off), so a role change or a revoked session
 * takes effect on the very next request.
 */
export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) throw HttpError.unauthorized()

  const { user } = session
  c.set('viewer', { id: user.id, name: user.name, email: user.email, role: toRole(user.role) })
  await next()
})

/** Use after `requireAuth`. Checks the role only; ownership is the service's job. */
export function requireRole(...roles: Role[]) {
  return createMiddleware<AuthEnv>(async (c, next) => {
    if (!roles.includes(c.var.viewer.role)) throw HttpError.forbidden()
    await next()
  })
}
