import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { validate } from '@server/middleware/validate.middleware'
import { programmeParam } from '@shared/schemas/learning-engine'
import { Hono } from 'hono'
import * as controller from './ai-path.controller'
import { aiPathLearnerRoles, aiPathPingRoles } from './ai-path.policy'

/** Mounted at /api/ai-path. Demo mode: scripted, deterministic recommendation (brief §9). */
export const aiPathRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get('/ping', requireRole(...aiPathPingRoles), (c) => c.json(controller.ping(), 200))
  .get(
    '/:programme',
    requireRole(...aiPathLearnerRoles),
    validate('param', programmeParam),
    async (c) =>
      c.json(await controller.recommendation(c.var.viewer, c.req.valid('param').programme), 200),
  )
  .post(
    '/:programme/accept',
    requireRole(...aiPathLearnerRoles),
    validate('param', programmeParam),
    async (c) => c.json(await controller.accept(c.var.viewer, c.req.valid('param').programme), 200),
  )
