import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { Hono } from 'hono'
import * as aiAnalyticsController from './ai-analytics.controller'
import { aiAnalyticsPingRoles } from './ai-analytics.policy'

/** Mounted at /api/ai-analytics in server/app.ts. Replace `ping` with the module's real endpoints. */
export const aiAnalyticsRoutes = new Hono<AuthEnv>()
  .use(requireAuth, requireRole(...aiAnalyticsPingRoles))
  .get('/ping', (c) => c.json(aiAnalyticsController.ping(), 200))
