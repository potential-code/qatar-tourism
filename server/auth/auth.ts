import { env, isDeployed } from '@server/config/env'
import { db } from '@server/db/connection'
import * as schema from '@server/db/schema'
import { logger } from '@server/lib/logger'
import { CREDENTIAL_LIMIT } from '@server/middleware/rate-limit.middleware'
import { sendResetPasswordEmail, sendVerifyEmail } from '@server/services/email.service'
import { DEFAULT_ROLE } from '@shared/roles'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'

/**
 * Header carrying the client IP resolved by `clientIp()`. The auth route overwrites it on every
 * request before Better Auth sees it, so Better Auth's rate limiter and session records use
 * the same trusted address as ours rather than a raw, spoofable X-Forwarded-For.
 */
export const CLIENT_IP_HEADER = 'x-client-ip'

const credentialRule = { window: CREDENTIAL_LIMIT.windowSeconds, max: CREDENTIAL_LIMIT.max }

// Emails are not awaited: the response time must not reveal whether an address exists, and a
// mail outage must not fail the auth request.
function sendInBackground(kind: string, send: Promise<void>) {
  send.catch((error: unknown) => logger.error({ err: error, kind }, 'Failed to send email'))
}

export const auth = betterAuth({
  appName: 'Project Skeleton',
  baseURL: env.BETTER_AUTH_URL,
  basePath: '/api/auth',
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: env.CLIENT_URL,
  database: drizzleAdapter(db, { provider: 'pg', schema }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    sendResetPassword: async ({ user, url }) => {
      sendInBackground(
        'reset-password',
        sendResetPasswordEmail(user.email, { name: user.name, url }),
      )
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      sendInBackground('verify-email', sendVerifyEmail(user.email, { name: user.name, url }))
    },
  },

  user: {
    additionalFields: {
      // input: false — a client can never choose its own role at sign-up or on update.
      role: { type: 'string', input: false, defaultValue: DEFAULT_ROLE },
    },
  },

  session: {
    // Kept off on purpose: with the cookie cache on, getSession trusts a signed cookie for a few
    // minutes, so a demoted user or a revoked session would keep working until it expires.
    // Off, every request re-reads the session and the user (and so the role) from the database.
    cookieCache: { enabled: false },
  },

  // On in every environment (Better Auth only enables it in production by default), so the
  // limits behave the same in development. Memory storage: fine for one instance.
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      '/sign-in/*': credentialRule,
      '/sign-up/*': credentialRule,
      '/request-password-reset': credentialRule,
      '/reset-password': credentialRule,
      '/reset-password/*': credentialRule,
      '/send-verification-email': credentialRule,
    },
  },

  advanced: {
    useSecureCookies: isDeployed,
    ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
  },
})

export type Auth = typeof auth
