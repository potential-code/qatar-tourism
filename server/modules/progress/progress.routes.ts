import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { Hono } from 'hono'
import * as progressController from './progress.controller'
import { progressPingRoles } from './progress.policy'

/** Mounted at /api/progress in server/app.ts. Replace `ping` with the module's real endpoints. */
export const progressRoutes = new Hono<AuthEnv>()
  .use(requireAuth, requireRole(...progressPingRoles))
  .get('/ping', (c) => c.json(progressController.ping(), 200))
