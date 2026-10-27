import { auth } from '@server/auth/auth'

/**
 * Creates a real Better Auth session for a seeded demo account, without a password. Used only
 * by the demo facilitator switch and the simulated SSO buttons, each of which restricts the
 * accounts it may reach to a fixed list. The route writes the returned cookie.
 */
export async function createDemoSession(userId: string, replaceToken?: string) {
  const context = await auth.$context
  const session = await context.internalAdapter.createSession(userId)
  if (!session) throw new Error('Could not create the demo session')
  if (replaceToken) await context.internalAdapter.deleteSession(replaceToken)
  return {
    token: session.token,
    cookie: {
      name: context.authCookies.sessionToken.name,
      attributes: context.authCookies.sessionToken.attributes,
      maxAge: context.sessionConfig.expiresIn,
      secret: context.secret,
    },
  }
}

export type DemoSession = Awaited<ReturnType<typeof createDemoSession>>
