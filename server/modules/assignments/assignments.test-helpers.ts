import { spyOn } from 'bun:test'
import { auth } from '@server/auth/auth'
import type { Role } from '@shared/roles'

/** Signs the next requests in as a specific seeded user (e.g. 'user-l0004', 'user-t01'). */
export function signInAs(id: string, role: Role) {
  const spy = spyOn(auth.api, 'getSession')
  const user = {
    id,
    name: `Test ${id}`,
    email: `${id}@example.com`,
    emailVerified: true,
    image: null,
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  spy.mockResolvedValue({
    user,
    session: {
      id: `session-${id}`,
      userId: id,
      token: 'token',
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      updatedAt: new Date(),
      ipAddress: null,
      userAgent: null,
    },
  } as never)
  return spy
}

export const ORIGIN = 'http://localhost:5173'

export function json(body: unknown, method = 'POST'): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
    body: JSON.stringify(body),
  }
}
