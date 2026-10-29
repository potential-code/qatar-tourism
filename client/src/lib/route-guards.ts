import { ROLE_HOME, type Role } from '@shared/roles'
import { redirect } from '@tanstack/react-router'
import type { RouterContext } from '@/lib/router-context'
import { roleOf } from '@/lib/session'

/** For signed-out pages (login, register…): a signed-in visitor goes straight to their portal. */
export async function redirectIfSignedIn({ context }: { context: RouterContext }) {
  const session = await context.auth.getSession()
  const role = roleOf(session)
  if (session && role) throw redirect({ to: ROLE_HOME[role] as never })
}

/**
 * Portal guard (brief §3): no session → sign in; wrong role → that user's own portal.
 * UX only. Changing the URL never grants access because every service checks the role itself.
 */
export function requireRole(required: Role) {
  return async ({ context, location }: { context: RouterContext; location: { href: string } }) => {
    const session = await context.auth.getSession()
    if (!session)
      throw redirect({ to: '/login' as never, search: { redirect: location.href } as never })
    const role = roleOf(session)
    if (role !== required) throw redirect({ to: (role ? ROLE_HOME[role] : '/') as never })
    return { session, role }
  }
}
