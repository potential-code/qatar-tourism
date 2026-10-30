import type { UserRow } from '@shared/types/db'
import { flush } from '@/mocks/db'
import { ApiError, commit, db } from '../api'

/**
 * Starting and ending the demo session (formerly Better Auth sessions and
 * server/modules/profiles/demo-session.ts). Shared by sign-in, the facilitator switch,
 * simulated SSO and registration verification.
 */

export const SUSPENDED_MESSAGE = 'This account is suspended. Contact the Academy administrator.'

export const LOCKED_MESSAGE = 'This account is locked. Contact Academy support.'

export function isLocked(userId: string): boolean {
  return db.profiles.find((p) => p.userId === userId)?.accountStatus === 'locked'
}

export function isSuspended(userId: string): boolean {
  return db.profiles.find((p) => p.userId === userId)?.suspended === true
}

/**
 * Signs `user` in. A suspended account may not start a session by any route (403
 * ACCOUNT_SUSPENDED), nor a locked one (403 ACCOUNT_LOCKED). `facilitatorId` is the demo administrator behind a quick switch.
 */
export function startSession(user: UserRow, facilitatorId: string | null = null): void {
  if (isSuspended(user.id)) throw new ApiError(403, 'ACCOUNT_SUSPENDED', SUSPENDED_MESSAGE)
  // A locked account (simulated, reversible, set by an administrator) cannot sign in by any route.
  if (isLocked(user.id)) throw new ApiError(403, 'ACCOUNT_LOCKED', LOCKED_MESSAGE)
  db.session = { userId: user.id, facilitatorId }
  saveNow()
}

export function endSession(): void {
  db.session = null
  saveNow()
}

/** Session changes are saved at once, so a reload straight after signing in keeps the session. */
function saveNow(): void {
  commit()
  void flush()
}
