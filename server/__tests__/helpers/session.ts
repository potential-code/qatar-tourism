import { spyOn } from 'bun:test'
import { auth } from '@server/auth/auth'
import type { Role } from '@shared/roles'

/**
 * Replaces Better Auth's session lookup, the one place requireAuth touches the database.
 * `null` means "no session".
 */
export function stubSession(role: Role | null) {
  const spy = spyOn(auth.api, 'getSession')
  const user = role && {
    id: `user-${role}`,
    name: `Test ${role}`,
    email: `${role}@example.com`,
    emailVerified: true,
    image: null,
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  const session = user && {
    user,
    session: {
      id: 'session-1',
      userId: user.id,
      token: 'token',
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      updatedAt: new Date(),
      ipAddress: null,
      userAgent: null,
    },
  }
  spy.mockResolvedValue(session as never)
  return spy
}
