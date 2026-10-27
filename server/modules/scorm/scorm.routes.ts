import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { Hono } from 'hono'
import * as scormController from './scorm.controller'
import { scormPingRoles } from './scorm.policy'

/** Mounted at /api/scorm in server/app.ts. Replace `ping` with the module's real endpoints. */
export const scormRoutes = new Hono<AuthEnv>()
  .use(requireAuth, requireRole(...scormPingRoles))
  .get('/ping', (c) => c.json(scormController.ping(), 200))
