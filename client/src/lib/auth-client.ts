import { ROLES, type Role } from '@shared/roles'
import { inferAdditionalFields } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import { env } from '@/config/env'

/**
 * Better Auth client. The server mounts Better Auth under /api/auth on the API origin.
 *
 * `role` is declared here rather than inferred from the server's auth instance so the client
 * never needs the server's config in its type graph. Keep it in sync with
 * server/auth/auth.ts `user.additionalFields`.
 */
export const authClient = createAuthClient({
  baseURL: env.VITE_API_URL,
  basePath: '/api/auth',
  plugins: [
    inferAdditionalFields({
      user: { role: { type: 'string', input: false } },
    }),
  ],
})

export type Session = typeof authClient.$Infer.Session

export function roleOf(session: Session | null | undefined): Role | null {
  const role = session?.user.role
  return ROLES.find((known) => known === role) ?? null
}
