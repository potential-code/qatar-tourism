import { DEMO_PASSWORD } from '@shared/constants'
import type { UserRow } from '@shared/types/db'
import { ApiError, currentUser, db, delay, out } from './api'
import { endSession, startSession } from './auth/session'

/**
 * Demo authentication (formerly Better Auth). Seeded accounts sign in with DEMO_PASSWORD;
 * accounts registered in this browser with the password they chose. The session lives in the
 * demo database, so it survives reloads and is kept by a demo reset.
 */

export { getFacilitatorStatus, switchFacilitator } from './auth/facilitator'
export { isSuspended, SUSPENDED_MESSAGE, startSession } from './auth/session'

/** The signed-in account as the UI sees it (the old Better Auth `session.user`). */
export type SessionUser = Pick<
  UserRow,
  'id' | 'name' | 'email' | 'emailVerified' | 'image' | 'role' | 'createdAt' | 'updatedAt'
>
export type Session = { user: SessionUser }

const toSession = (user: UserRow): Session => ({
  user: {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    image: user.image,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  },
})

/** The current session, or null when signed out. */
export async function getSession(): Promise<Session | null> {
  await delay(60)
  const user = currentUser()
  return user ? out(toSession(user)) : null
}

const findByEmail = (email: string) => {
  const wanted = email.trim().toLowerCase()
  return db.users.find((u) => u.email.toLowerCase() === wanted)
}

const passwordOf = (userId: string) => db.passwords[userId] ?? DEMO_PASSWORD

/**
 * Email and password sign-in. 401 INVALID_CREDENTIALS for an unknown email or a wrong password
 * (one message, so the response never reveals which), 403 EMAIL_NOT_VERIFIED for a registered
 * account that has not entered its demo code, 403 ACCOUNT_SUSPENDED for a suspended account.
 */
export async function signIn(email: string, password: string): Promise<Session> {
  await delay(300)
  const user = findByEmail(email)
  if (!user || password !== passwordOf(user.id)) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password')
  }
  if (!user.emailVerified) {
    throw new ApiError(403, 'EMAIL_NOT_VERIFIED', 'Verify your email address to sign in')
  }
  startSession(user)
  return out(toSession(user))
}

/** Demo deep link (`?demo-as=<userId>`): signs in as any existing, unsuspended account. */
export async function signInAs(userId: string): Promise<Session> {
  const user = db.users.find((u) => u.id === userId)
  if (!user) throw ApiError.notFound('That demo account is not in the current dataset')
  startSession(user)
  return out(toSession(user))
}

export async function signOut(): Promise<void> {
  await delay(120)
  endSession()
}

/** The signed-in learner's profile status ('draft' resumes the wizard), or null. */
export async function getOwnProfileStatus() {
  await delay(60)
  const user = currentUser()
  const profile = user ? db.profiles.find((p) => p.userId === user.id) : undefined
  return profile?.status ?? null
}
