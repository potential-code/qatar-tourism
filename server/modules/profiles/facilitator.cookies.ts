import { auth } from '@server/auth/auth'
import { env, isDeployed } from '@server/config/env'
import { HttpError } from '@server/lib/errors'
import type { AuthEnv } from '@server/middleware/auth.middleware'
import type { Context } from 'hono'
import { getSignedCookie, setSignedCookie } from 'hono/cookie'

/**
 * HTTP side of the facilitator switch: reading and writing cookies stays in the route layer.
 * Better Auth signs its session cookie as `value.HMAC-SHA256(secret)`, the same format as
 * Hono's signed cookies, so a session created here is read by Better Auth unchanged.
 */
export const FACILITATOR_COOKIE = 'qta_demo_facilitator'
const FACILITATOR_MAX_AGE = 8 * 60 * 60

export async function currentSessionToken(c: Context<AuthEnv>): Promise<string> {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) throw HttpError.unauthorized()
  return session.session.token
}

export function readFacilitatorCookie(c: Context<AuthEnv>) {
  return getSignedCookie(c, env.BETTER_AUTH_SECRET, FACILITATOR_COOKIE)
}

export async function writeSwitchCookies(
  c: Context<AuthEnv>,
  facilitator: string,
  session: {
    token: string
    cookie: {
      name: string
      attributes: {
        path?: string
        sameSite?: string
        httpOnly?: boolean
        secure?: boolean
        domain?: string
      }
      maxAge: number
      secret: string
    }
  },
) {
  const { attributes } = session.cookie
  await setSignedCookie(c, session.cookie.name, session.token, session.cookie.secret, {
    path: attributes.path ?? '/',
    httpOnly: true,
    secure: attributes.secure ?? isDeployed,
    sameSite: 'Lax',
    ...(attributes.domain ? { domain: attributes.domain } : {}),
    maxAge: session.cookie.maxAge,
  })
  await setSignedCookie(c, FACILITATOR_COOKIE, facilitator, env.BETTER_AUTH_SECRET, {
    path: '/api',
    httpOnly: true,
    secure: isDeployed,
    sameSite: 'Lax',
    maxAge: FACILITATOR_MAX_AGE,
  })
}
