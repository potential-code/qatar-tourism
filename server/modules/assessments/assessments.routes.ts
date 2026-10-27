import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { validate } from '@server/middleware/validate.middleware'
import { idParam } from '@shared/schemas/common'
import {
  assessmentKindParam,
  assessmentSaveBody,
  programmeParam,
} from '@shared/schemas/learning-engine'
import { Hono } from 'hono'
import * as controller from './assessments.controller'
import { assessmentsLearnerRoles, assessmentsPingRoles } from './assessments.policy'

const learnerOnly = requireRole(...assessmentsLearnerRoles)

/** Mounted at /api/assessments. Baseline, foundation quiz and post / final (brief §8). */
export const assessmentsRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get('/ping', requireRole(...assessmentsPingRoles), (c) => c.json(controller.ping(), 200))
  .get('/attempts/:id/result', learnerOnly, validate('param', idParam), async (c) =>
    c.json(await controller.result(c.var.viewer, c.req.valid('param').id), 200),
  )
  .patch(
    '/attempts/:id/answer',
    learnerOnly,
    validate('param', idParam),
    validate('json', assessmentSaveBody),
    async (c) => {
      const { competency, option } = c.req.valid('json')
      return c.json(
        await controller.save(c.var.viewer, c.req.valid('param').id, competency, option),
        200,
      )
    },
  )
  .post('/attempts/:id/submit', learnerOnly, validate('param', idParam), async (c) =>
    c.json(await controller.submit(c.var.viewer, c.req.valid('param').id), 200),
  )
  .get('/:programme', learnerOnly, validate('param', programmeParam), async (c) =>
    c.json(await controller.overview(c.var.viewer, c.req.valid('param').programme), 200),
  )
  .get('/:programme/:kind', learnerOnly, validate('param', assessmentKindParam), async (c) => {
    const { programme, kind } = c.req.valid('param')
    return c.json(await controller.state(c.var.viewer, programme, kind), 200)
  })
  .post(
    '/:programme/:kind/start',
    learnerOnly,
    validate('param', assessmentKindParam),
    async (c) => {
      const { programme, kind } = c.req.valid('param')
      return c.json(await controller.start(c.var.viewer, programme, kind), 200)
    },
  )
