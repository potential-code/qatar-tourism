import { ROLES, type Role } from '@shared/roles'
import type { Session } from '@/services/auth.service'

export type { Session, SessionUser } from '@/services/auth.service'

/** The session's role, or null when signed out (or the stored role is unknown). */
export function roleOf(session: Session | null | undefined): Role | null {
  const role = session?.user.role
  return ROLES.find((known) => known === role) ?? null
}
