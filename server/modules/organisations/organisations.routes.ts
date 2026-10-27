import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { Hono } from 'hono'
import * as organisationsController from './organisations.controller'
import { organisationsPingRoles } from './organisations.policy'

/** Mounted at /api/organisations in server/app.ts. Replace `ping` with the module's real endpoints. */
export const organisationsRoutes = new Hono<AuthEnv>()
  .use(requireAuth, requireRole(...organisationsPingRoles))
  .get('/ping', (c) => c.json(organisationsController.ping(), 200))
