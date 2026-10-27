import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { Hono } from 'hono'
import * as profilesController from './profiles.controller'
import { profilesPingRoles } from './profiles.policy'

/** Mounted at /api/profiles in server/app.ts. Replace `ping` with the module's real endpoints. */
export const profilesRoutes = new Hono<AuthEnv>()
  .use(requireAuth, requireRole(...profilesPingRoles))
  .get('/ping', (c) => c.json(profilesController.ping(), 200))
