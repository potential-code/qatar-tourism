import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { Hono } from 'hono'
import * as sessionsController from './sessions.controller'
import { sessionsPingRoles } from './sessions.policy'

/** Mounted at /api/sessions in server/app.ts. Replace `ping` with the module's real endpoints. */
export const sessionsRoutes = new Hono<AuthEnv>()
  .use(requireAuth, requireRole(...sessionsPingRoles))
  .get('/ping', (c) => c.json(sessionsController.ping(), 200))
