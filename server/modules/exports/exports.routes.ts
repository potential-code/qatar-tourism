import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { Hono } from 'hono'
import * as exportsController from './exports.controller'
import { exportsPingRoles } from './exports.policy'

/** Mounted at /api/exports in server/app.ts. Replace `ping` with the module's real endpoints. */
export const exportsRoutes = new Hono<AuthEnv>()
  .use(requireAuth, requireRole(...exportsPingRoles))
  .get('/ping', (c) => c.json(exportsController.ping(), 200))
