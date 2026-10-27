import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { Hono } from 'hono'
import * as assignmentsController from './assignments.controller'
import { assignmentsPingRoles } from './assignments.policy'

/** Mounted at /api/assignments in server/app.ts. Replace `ping` with the module's real endpoints. */
export const assignmentsRoutes = new Hono<AuthEnv>()
  .use(requireAuth, requireRole(...assignmentsPingRoles))
  .get('/ping', (c) => c.json(assignmentsController.ping(), 200))
