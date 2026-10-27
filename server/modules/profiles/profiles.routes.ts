import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { credentialRateLimit } from '@server/middleware/rate-limit.middleware'
import { validate } from '@server/middleware/validate.middleware'
import { profileCompleteInput, profileDraftInput, registerInput } from '@shared/schemas'
import {
  facilitatorSwitchInput,
  pathRevisionInput,
  profileUpdateInput,
  resendSimulatedInput,
  verifySimulatedInput,
} from '@shared/schemas/profile-account'
import { Hono } from 'hono'
import { z } from 'zod'
import {
  currentSessionToken,
  readFacilitatorCookie,
  writeFacilitatorCookie,
  writeSessionCookie,
} from './facilitator.cookies'
import { packFacilitator } from './facilitator.service'
import * as profilesController from './profiles.controller'
import { OWN_PROFILE_ROLES } from './profiles.policy'
import { SSO_PROVIDERS } from './sso.service'

const ssoInput = z.object({ provider: z.enum(SSO_PROVIDERS) })

const ownProfile = [requireAuth, requireRole(...OWN_PROFILE_ROLES)] as const

/**
 * Mounted at /api/profiles in server/app.ts.
 *   /register*        public, credential rate limit (brief §3 open registration)
 *   /me*              the signed-in learner's own profile
 *   /sso/simulated    public, SIMULATED SSO into a fixed mock learner (labelled in the UI)
 *   /facilitator*     demo toolbar, demo administrator only (checked in the controller/policy)
 */
export const profilesRoutes = new Hono<AuthEnv>()
  .post('/register', credentialRateLimit, validate('json', registerInput), async (c) =>
    c.json(await profilesController.register(c.req.valid('json')), 201),
  )
  .post(
    '/register/verify',
    credentialRateLimit,
    validate('json', verifySimulatedInput),
    async (c) => {
      const { email, code } = c.req.valid('json')
      return c.json(await profilesController.verify(email, code), 200)
    },
  )
  .post(
    '/register/resend',
    credentialRateLimit,
    validate('json', resendSimulatedInput),
    async (c) => c.json(await profilesController.resend(c.req.valid('json').email), 200),
  )
  .post('/sso/simulated', credentialRateLimit, validate('json', ssoInput), async (c) => {
    const { session, result } = await profilesController.simulatedSso(c.req.valid('json').provider)
    await writeSessionCookie(c, session)
    return c.json(result, 200)
  })
  .get('/ping', requireAuth, (c) => c.json(profilesController.ping(), 200))
  .get('/me', ...ownProfile, async (c) =>
    c.json(await profilesController.getMine(c.var.viewer), 200),
  )
  .patch('/me/draft', ...ownProfile, validate('json', profileDraftInput), async (c) =>
    c.json(await profilesController.saveDraft(c.var.viewer, c.req.valid('json')), 200),
  )
  .post('/me/complete', ...ownProfile, validate('json', profileCompleteInput), async (c) =>
    c.json(await profilesController.complete(c.var.viewer, c.req.valid('json')), 200),
  )
  .patch('/me', ...ownProfile, validate('json', profileUpdateInput), async (c) =>
    c.json(await profilesController.update(c.var.viewer, c.req.valid('json')), 200),
  )
  .post('/me/path-revision', ...ownProfile, validate('json', pathRevisionInput), async (c) =>
    c.json(
      await profilesController.acceptRevision(c.var.viewer, c.req.valid('json').programme),
      200,
    ),
  )
  .get('/facilitator', requireAuth, async (c) => {
    const token = await currentSessionToken(c)
    const cookie = await readFacilitatorCookie(c)
    return c.json(await profilesController.facilitatorStatus(c.var.viewer, token, cookie), 200)
  })
  .post('/facilitator/switch', requireAuth, validate('json', facilitatorSwitchInput), async (c) => {
    const token = await currentSessionToken(c)
    const cookie = await readFacilitatorCookie(c)
    const { adminId, session, result } = await profilesController.facilitatorSwitch(
      c.var.viewer,
      token,
      cookie,
      c.req.valid('json').target,
    )
    await writeSessionCookie(c, session)
    await writeFacilitatorCookie(c, packFacilitator(adminId, session.token))
    return c.json(result, 200)
  })
