import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { Hono } from 'hono'
import * as pathsController from './paths.controller'
import { pathsPingRoles } from './paths.policy'

/** Mounted at /api/paths in server/app.ts. Replace `ping` with the module's real endpoints. */
export const pathsRoutes = new Hono<AuthEnv>()
  .use(requireAuth, requireRole(...pathsPingRoles))
  .get('/ping', (c) => c.json(pathsController.ping(), 200))
