import { env } from '@server/config/env'
import { errorBody } from '@server/lib/errors'
import type { Context } from 'hono'
import { getConnInfo } from 'hono/bun'
import { rateLimiter } from 'hono-rate-limiter'

/**
 * The client's IP, used as the rate-limit key and handed to Better Auth.
 *
 * By default this is the TCP peer address from Bun's `server.requestIP()`, which a client
 * cannot forge. X-Forwarded-For is only read when TRUST_PROXY=true, i.e. when the app is
 * reachable solely through our own reverse proxy (Traefik under Dokploy). Even then we take the
 * right-most entry: that is the address our proxy appended, while everything to its left came
 * from the client and can be made up.
 */
export function clientIp(c: Context, trustProxy = env.TRUST_PROXY): string {
  if (trustProxy) {
    const hops = (c.req.header('x-forwarded-for') ?? '')
      .split(',')
      .map((hop) => hop.trim())
      .filter(Boolean)
    const nearest = hops.at(-1)
    if (nearest) return nearest
  }
  try {
    return getConnInfo(c).remote.address ?? 'unknown'
  } catch {
    // Only outside Bun.serve (e.g. `app.request()` in tests) is there no socket to ask.
    return 'unknown'
  }
}

function limitExceeded(c: Context) {
  return c.json(errorBody('RATE_LIMITED', 'Too many requests, please try again later.'), 429)
}

/** Every /api request: generous, just a brake on scraping and floods. */
export const globalRateLimit = rateLimiter({
  windowMs: 60 * 1000,
  limit: env.API_RATE_LIMIT_PER_MINUTE,
  standardHeaders: 'draft-7',
  keyGenerator: (c) => clientIp(c),
  handler: limitExceeded,
})

/** Settings shared with Better Auth's own limiter so both layers agree. */
// Demo setting: presenters rehearse the walkthrough from one machine, so allow more attempts.
export const CREDENTIAL_LIMIT = { windowSeconds: 15 * 60, max: env.CREDENTIAL_RATE_LIMIT } as const

/**
 * Credential endpoints (sign-in, sign-up, password reset): tight, to slow brute force and
 * email enumeration. One bucket per IP across all of them.
 */
export const credentialRateLimit = rateLimiter({
  windowMs: CREDENTIAL_LIMIT.windowSeconds * 1000,
  limit: CREDENTIAL_LIMIT.max,
  standardHeaders: 'draft-7',
  keyGenerator: (c) => `credentials:${clientIp(c)}`,
  handler: limitExceeded,
})
