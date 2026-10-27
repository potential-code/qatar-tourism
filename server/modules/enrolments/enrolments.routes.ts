import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { validate } from '@server/middleware/validate.middleware'
import { enrolInput } from '@shared/schemas/learning'
import { Hono } from 'hono'
import * as controller from './enrolments.controller'
import { enrolmentsLearnerRoles, enrolmentsPingRoles } from './enrolments.policy'

const learnerOnly = requireRole(...enrolmentsLearnerRoles)

/** Mounted at /api/enrolments. */
export const enrolmentsRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get('/ping', requireRole(...enrolmentsPingRoles), (c) => c.json(controller.ping(), 200))
  .get('/mine', learnerOnly, async (c) => c.json(await controller.mine(c.var.viewer), 200))
  .post('/', learnerOnly, validate('json', enrolInput), async (c) =>
    c.json(await controller.enrol(c.var.viewer, c.req.valid('json').programme), 201),
  )
