import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { withScope } from '@server/middleware/scope.middleware'
import { validate } from '@server/middleware/validate.middleware'
import { sessionScoreInput } from '@shared/schemas/session'
import { attendanceUpdateInput } from '@shared/schemas/trainer-ops'
import { Hono } from 'hono'
import { z } from 'zod'
import { actorOf } from '../sessions/actor'
import * as attendanceController from './attendance.controller'
import { attendancePingRoles, MARKING_ROLES } from './attendance.policy'

const sessionParam = z.object({ sessionId: z.uuid() })

/** Mounted at /api/attendance: rosters, attendance, rubric scoring and assigned learners. */
export const attendanceRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get('/ping', requireRole(...attendancePingRoles), (c) =>
    c.json(attendanceController.ping(), 200),
  )
  .get('/learners', requireRole(...MARKING_ROLES), withScope, async (c) =>
    c.json(await attendanceController.learners(c.var.scope, c.var.viewer.role), 200),
  )
  .get(
    '/sessions/:sessionId/roster',
    requireRole(...MARKING_ROLES),
    withScope,
    validate('param', sessionParam),
    async (c) =>
      c.json(
        await attendanceController.roster(
          c.var.scope,
          c.var.viewer.role,
          c.req.valid('param').sessionId,
        ),
        200,
      ),
  )
  .post(
    '/mark',
    requireRole(...MARKING_ROLES),
    withScope,
    validate('json', attendanceUpdateInput),
    async (c) =>
      c.json(await attendanceController.mark(actorOf(c), c.var.scope, c.req.valid('json')), 200),
  )
  .post(
    '/score',
    requireRole(...MARKING_ROLES),
    withScope,
    validate('json', sessionScoreInput),
    async (c) =>
      c.json(await attendanceController.score(actorOf(c), c.var.scope, c.req.valid('json')), 200),
  )
