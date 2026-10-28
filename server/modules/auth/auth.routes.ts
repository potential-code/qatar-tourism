import { auth, CLIENT_IP_HEADER } from '@server/auth/auth'
import { HttpError } from '@server/lib/errors'
import { clientIp, credentialRateLimit } from '@server/middleware/rate-limit.middleware'
import { Hono } from 'hono'

/**
 * Better Auth owns everything under /api/auth. Not part of `AppType`: the client talks to it
 * through better-auth's own client. Credential endpoints get the tight limiter first.
 */
export const authRoutes = new Hono()
  // Accounts are created only through /api/profiles/register (fictional-address rule, learner
  // profile, default Program B enrolment) or by an admin. Better Auth's own sign-up endpoint
  // would skip all of that, so it is not exposed over HTTP; the services call it in-process.
  .all('/sign-up/*', () => {
    throw HttpError.notFound()
  })
  .use('/sign-in/*', credentialRateLimit)
  .use('/request-password-reset', credentialRateLimit)
  .use('/reset-password', credentialRateLimit)
  .use('/reset-password/*', credentialRateLimit)
  .use('/send-verification-email', credentialRateLimit)
  .on(['GET', 'POST'], '/*', (c) => {
    // Replace whatever the client sent with the IP we trust (see clientIp).
    const headers = new Headers(c.req.raw.headers)
    headers.set(CLIENT_IP_HEADER, clientIp(c))
    return auth.handler(new Request(c.req.raw, { headers }))
  })
