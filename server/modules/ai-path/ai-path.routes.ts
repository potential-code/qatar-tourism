import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { Hono } from 'hono'
import * as aiPathController from './ai-path.controller'
import { aiPathPingRoles } from './ai-path.policy'

/** Mounted at /api/ai-path in server/app.ts. Replace `ping` with the module's real endpoints. */
export const aiPathRoutes = new Hono<AuthEnv>()
  .use(requireAuth, requireRole(...aiPathPingRoles))
  .get('/ping', (c) => c.json(aiPathController.ping(), 200))
