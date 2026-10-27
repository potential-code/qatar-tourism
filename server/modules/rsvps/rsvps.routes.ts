import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { Hono } from 'hono'
import * as rsvpsController from './rsvps.controller'
import { rsvpsPingRoles } from './rsvps.policy'

/** Mounted at /api/rsvps in server/app.ts. Replace `ping` with the module's real endpoints. */
export const rsvpsRoutes = new Hono<AuthEnv>()
  .use(requireAuth, requireRole(...rsvpsPingRoles))
  .get('/ping', (c) => c.json(rsvpsController.ping(), 200))
