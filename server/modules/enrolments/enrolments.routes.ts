import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { Hono } from 'hono'
import * as enrolmentsController from './enrolments.controller'
import { enrolmentsPingRoles } from './enrolments.policy'

/** Mounted at /api/enrolments in server/app.ts. Replace `ping` with the module's real endpoints. */
export const enrolmentsRoutes = new Hono<AuthEnv>()
  .use(requireAuth, requireRole(...enrolmentsPingRoles))
  .get('/ping', (c) => c.json(enrolmentsController.ping(), 200))
