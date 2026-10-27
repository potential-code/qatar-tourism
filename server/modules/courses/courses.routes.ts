import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { validate } from '@server/middleware/validate.middleware'
import { courseCodeParam, programmeQuery } from '@shared/schemas/learning-engine'
import { Hono } from 'hono'
import * as controller from './courses.controller'
import { coursesLearnerRoles, coursesPingRoles } from './courses.policy'

/** Mounted at /api/courses. The unit player's content and the learner's progress on it. */
export const coursesRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get('/ping', requireRole(...coursesPingRoles), (c) => c.json(controller.ping(), 200))
  .get(
    '/:code',
    requireRole(...coursesLearnerRoles),
    validate('param', courseCodeParam),
    validate('query', programmeQuery),
    async (c) =>
      c.json(
        await controller.unit(
          c.var.viewer,
          c.req.valid('query').programme,
          c.req.valid('param').code,
        ),
        200,
      ),
  )
