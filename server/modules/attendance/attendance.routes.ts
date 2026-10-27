import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { Hono } from 'hono'
import * as attendanceController from './attendance.controller'
import { attendancePingRoles } from './attendance.policy'

/** Mounted at /api/attendance in server/app.ts. Replace `ping` with the module's real endpoints. */
export const attendanceRoutes = new Hono<AuthEnv>()
  .use(requireAuth, requireRole(...attendancePingRoles))
  .get('/ping', (c) => c.json(attendanceController.ping(), 200))
