import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { validate } from '@server/middleware/validate.middleware'
import {
  branchingBody,
  formativeAnswerBody,
  previewViewedBody,
  programmeParam,
  resourceBody,
  videoProgressBody,
} from '@shared/schemas/learning-engine'
import { Hono } from 'hono'
import * as controller from './progress.controller'
import { progressLearnerRoles, progressPingRoles } from './progress.policy'

const learnerOnly = requireRole(...progressLearnerRoles)

/** Mounted at /api/progress. Learner journey read model and unit events (brief §5–8). */
export const progressRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get('/ping', requireRole(...progressPingRoles), (c) => c.json(controller.ping(), 200))
  .get('/:programme/journey', learnerOnly, validate('param', programmeParam), async (c) =>
    c.json(await controller.journey(c.var.viewer, c.req.valid('param').programme), 200),
  )
  .get('/:programme/history', learnerOnly, validate('param', programmeParam), async (c) =>
    c.json(await controller.history(c.var.viewer, c.req.valid('param').programme), 200),
  )
  .post('/video', learnerOnly, validate('json', videoProgressBody), async (c) =>
    c.json(await controller.video(c.var.viewer, c.req.valid('json')), 200),
  )
  .post('/branching', learnerOnly, validate('json', branchingBody), async (c) =>
    c.json(await controller.branching(c.var.viewer, c.req.valid('json')), 200),
  )
  .post('/formative', learnerOnly, validate('json', formativeAnswerBody), async (c) =>
    c.json(await controller.formative(c.var.viewer, c.req.valid('json')), 200),
  )
  .post('/resource', learnerOnly, validate('json', resourceBody), async (c) =>
    c.json(await controller.resource(c.var.viewer, c.req.valid('json')), 200),
  )
  .post('/preview', learnerOnly, validate('json', previewViewedBody), async (c) =>
    c.json(await controller.preview(c.var.viewer, c.req.valid('json').programme), 200),
  )
