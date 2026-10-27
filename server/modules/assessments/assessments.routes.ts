import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { Hono } from 'hono'
import * as assessmentsController from './assessments.controller'
import { assessmentsPingRoles } from './assessments.policy'

/** Mounted at /api/assessments in server/app.ts. Replace `ping` with the module's real endpoints. */
export const assessmentsRoutes = new Hono<AuthEnv>()
  .use(requireAuth, requireRole(...assessmentsPingRoles))
  .get('/ping', (c) => c.json(assessmentsController.ping(), 200))
