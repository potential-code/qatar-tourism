import type { UserRow } from '@shared/types/db'
import { flush } from '@/mocks/db'
import { ApiError, commit, db } from '../api'

/**
 * Starting and ending the demo session (formerly Better Auth sessions and
 * server/modules/profiles/demo-session.ts). Shared by sign-in, the facilitator switch,
 * simulated SSO and registration verification.
 */

export const SUSPENDED_MESSAGE = 'This account is suspended. Contact the Academy administrator.'

export function isSuspended(userId: string): boolean {
  return db.profiles.find((p) => p.userId === userId)?.suspended === true
}

/**
 * Signs `user` in. A suspended account may not start a session by any route (403
 * ACCOUNT_SUSPENDED). `facilitatorId` is the demo administrator behind a quick switch.
 */
export function startSession(user: UserRow, facilitatorId: string | null = null): void {
  if (isSuspended(user.id)) throw new ApiError(403, 'ACCOUNT_SUSPENDED', SUSPENDED_MESSAGE)
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
