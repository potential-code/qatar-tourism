import { auth, CLIENT_IP_HEADER } from '@server/auth/auth'
import { clientIp, credentialRateLimit } from '@server/middleware/rate-limit.middleware'
import { Hono } from 'hono'

/**
 * Better Auth owns everything under /api/auth. Not part of `AppType`: the client talks to it
 * through better-auth's own client. Credential endpoints get the tight limiter first.
 */
export const authRoutes = new Hono()
  .use('/sign-in/*', credentialRateLimit)
  .use('/sign-up/*', credentialRateLimit)
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
