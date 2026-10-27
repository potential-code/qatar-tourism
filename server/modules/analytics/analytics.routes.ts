import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { Hono } from 'hono'
import * as analyticsController from './analytics.controller'
import { analyticsPingRoles } from './analytics.policy'

/** Mounted at /api/analytics in server/app.ts. Replace `ping` with the module's real endpoints. */
export const analyticsRoutes = new Hono<AuthEnv>()
  .use(requireAuth, requireRole(...analyticsPingRoles))
  .get('/ping', (c) => c.json(analyticsController.ping(), 200))
