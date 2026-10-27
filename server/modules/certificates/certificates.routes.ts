import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { Hono } from 'hono'
import * as certificatesController from './certificates.controller'
import { certificatesPingRoles } from './certificates.policy'

/** Mounted at /api/certificates in server/app.ts. Replace `ping` with the module's real endpoints. */
export const certificatesRoutes = new Hono<AuthEnv>()
  .use(requireAuth, requireRole(...certificatesPingRoles))
  .get('/ping', (c) => c.json(certificatesController.ping(), 200))
