import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { Hono } from 'hono'
import * as reportsController from './reports.controller'
import { reportsPingRoles } from './reports.policy'

/** Mounted at /api/reports in server/app.ts. Replace `ping` with the module's real endpoints. */
export const reportsRoutes = new Hono<AuthEnv>()
  .use(requireAuth, requireRole(...reportsPingRoles))
  .get('/ping', (c) => c.json(reportsController.ping(), 200))
