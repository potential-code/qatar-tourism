import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { Hono } from 'hono'
import * as programmesController from './programmes.controller'
import { programmesPingRoles } from './programmes.policy'

/** Mounted at /api/programmes in server/app.ts. Replace `ping` with the module's real endpoints. */
export const programmesRoutes = new Hono<AuthEnv>()
  .use(requireAuth, requireRole(...programmesPingRoles))
  .get('/ping', (c) => c.json(programmesController.ping(), 200))
