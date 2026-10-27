import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { Hono } from 'hono'
import * as coursesController from './courses.controller'
import { coursesPingRoles } from './courses.policy'

/** Mounted at /api/courses in server/app.ts. Replace `ping` with the module's real endpoints. */
export const coursesRoutes = new Hono<AuthEnv>()
  .use(requireAuth, requireRole(...coursesPingRoles))
  .get('/ping', (c) => c.json(coursesController.ping(), 200))
