import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { Hono } from 'hono'
import * as roleplayController from './roleplay.controller'
import { roleplayPingRoles } from './roleplay.policy'

/** Mounted at /api/roleplay in server/app.ts. Replace `ping` with the module's real endpoints. */
export const roleplayRoutes = new Hono<AuthEnv>()
  .use(requireAuth, requireRole(...roleplayPingRoles))
  .get('/ping', (c) => c.json(roleplayController.ping(), 200))
