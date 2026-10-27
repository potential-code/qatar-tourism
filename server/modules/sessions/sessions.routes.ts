import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { withScope } from '@server/middleware/scope.middleware'
import { validate } from '@server/middleware/validate.middleware'
import { SESSION_STATUSES } from '@shared/constants'
import { idParam, isoInstant } from '@shared/schemas/common'
import { sessionCancelInput, sessionRescheduleInput } from '@shared/schemas/session'
import { sessionCreateWithPublishInput, sessionUpdateInput } from '@shared/schemas/trainer-ops'
import { Hono } from 'hono'
import { z } from 'zod'
import { actorOf } from './actor'
import * as sessionsController from './sessions.controller'
import { SESSION_MANAGER_ROLES, sessionsPingRoles, TRAINER_ONLY } from './sessions.policy'

const listQuery = z.object({ status: z.enum(SESSION_STATUSES).optional() })
const impactQuery = z.object({ startsAt: isoInstant.optional(), endsAt: isoInstant.optional() })

/**
 * Mounted at /api/sessions: the trainer workspace (brief §10). Every handler resolves the
 * viewer's scope; services check each session id against it, so a trainer gets 403 for
 * another trainer's session whatever id they send.
 */
export const sessionsRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get('/ping', requireRole(...sessionsPingRoles), (c) => c.json(sessionsController.ping(), 200))
  .get('/overview', requireRole(...TRAINER_ONLY), withScope, async (c) =>
    c.json(await sessionsController.overview(c.var.scope), 200),
  )
  .get('/profile', requireRole(...TRAINER_ONLY), withScope, async (c) =>
    c.json(await sessionsController.profile(c.var.scope), 200),
  )
  .get('/resources', requireRole(...TRAINER_ONLY), withScope, async (c) =>
    c.json(await sessionsController.resources(c.var.scope), 200),
  )
  .get('/form-options', requireRole(...SESSION_MANAGER_ROLES), withScope, async (c) =>
    c.json(await sessionsController.formOptions(c.var.scope), 200),
  )
  .get(
    '/',
    requireRole(...SESSION_MANAGER_ROLES),
    withScope,
    validate('query', listQuery),
    async (c) =>
      c.json(await sessionsController.list(c.var.scope, c.req.valid('query').status), 200),
  )
  .post(
    '/',
    requireRole(...SESSION_MANAGER_ROLES),
    withScope,
    validate('json', sessionCreateWithPublishInput),
    async (c) => {
      const body = c.req.valid('json')
      return c.json(
        await sessionsController.create(actorOf(c), c.var.scope, body.session, body.publish),
        201,
      )
    },
  )
  .get(
    '/:id',
    requireRole(...SESSION_MANAGER_ROLES),
    withScope,
    validate('param', idParam),
    async (c) => c.json(await sessionsController.detail(c.var.scope, c.req.valid('param').id), 200),
  )
  .patch(
    '/:id',
    requireRole(...SESSION_MANAGER_ROLES),
    withScope,
    validate('param', idParam),
    validate('json', sessionUpdateInput),
    async (c) =>
      c.json(
        await sessionsController.update(
          actorOf(c),
          c.var.scope,
          c.req.valid('param').id,
          c.req.valid('json'),
        ),
        200,
      ),
  )
  .post(
    '/:id/publish',
    requireRole(...SESSION_MANAGER_ROLES),
    withScope,
    validate('param', idParam),
    async (c) =>
      c.json(
        await sessionsController.publish(actorOf(c), c.var.scope, c.req.valid('param').id),
        200,
      ),
  )
  .post(
    '/:id/complete',
    requireRole(...SESSION_MANAGER_ROLES),
    withScope,
    validate('param', idParam),
    async (c) =>
      c.json(
        await sessionsController.complete(actorOf(c), c.var.scope, c.req.valid('param').id),
        200,
      ),
  )
  .get(
    '/:id/impact',
    requireRole(...SESSION_MANAGER_ROLES),
    withScope,
    validate('param', idParam),
    validate('query', impactQuery),
    async (c) =>
      c.json(
        await sessionsController.impact(c.var.scope, c.req.valid('param').id, c.req.valid('query')),
        200,
      ),
  )
  .post(
    '/:id/reschedule',
    requireRole(...SESSION_MANAGER_ROLES),
    withScope,
    validate('param', idParam),
    validate('json', sessionRescheduleInput),
    async (c) =>
      c.json(
        await sessionsController.reschedule(
          actorOf(c),
          c.var.scope,
          c.req.valid('param').id,
          c.req.valid('json'),
        ),
        200,
      ),
  )
  .post(
    '/:id/cancel',
    requireRole(...SESSION_MANAGER_ROLES),
    withScope,
    validate('param', idParam),
    validate('json', sessionCancelInput),
    async (c) =>
      c.json(
        await sessionsController.cancel(
          actorOf(c),
          c.var.scope,
          c.req.valid('param').id,
          c.req.valid('json'),
        ),
        200,
      ),
  )
