import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { validate } from '@server/middleware/validate.middleware'
import {
  courseCodeParam,
  programmeQuery,
  scormCommitBody,
  scormRestartBody,
} from '@shared/schemas/learning-engine'
import { Hono } from 'hono'
import * as controller from './scorm.controller'
import { scormLearnerRoles, scormPingRoles } from './scorm.policy'

const learnerOnly = requireRole(...scormLearnerRoles)

/** Mounted at /api/scorm. Runtime persistence for the SCORM 2004 sample package (brief §8). */
export const scormRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get('/ping', requireRole(...scormPingRoles), (c) => c.json(controller.ping(), 200))
  .get(
    '/:code/state',
    learnerOnly,
    validate('param', courseCodeParam),
    validate('query', programmeQuery),
    async (c) =>
      c.json(
        await controller.state(
          c.var.viewer,
          c.req.valid('query').programme,
          c.req.valid('param').code,
        ),
        200,
      ),
  )
  .post(
    '/:code/commit',
    learnerOnly,
    validate('param', courseCodeParam),
    validate('json', scormCommitBody),
    async (c) =>
      c.json(
        await controller.commit(c.var.viewer, c.req.valid('param').code, c.req.valid('json')),
        200,
      ),
  )
  .post(
    '/:code/restart',
    learnerOnly,
    validate('param', courseCodeParam),
    validate('json', scormRestartBody),
    async (c) =>
      c.json(
        await controller.restart(
          c.var.viewer,
          c.req.valid('json').programme,
          c.req.valid('param').code,
        ),
        200,
      ),
  )
