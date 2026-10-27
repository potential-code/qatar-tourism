import { type AuthEnv, requireAuth } from '@server/middleware/auth.middleware'
import { validate } from '@server/middleware/validate.middleware'
import { PROGRAMME_CODES } from '@shared/constants'
import { programmeCodeParam } from '@shared/schemas/profile-account'
import { Hono } from 'hono'
import { z } from 'zod'
import * as programmesController from './programmes.controller'

const sessionsQuery = z.object({ programme: z.enum(PROGRAMME_CODES).optional() })
const trainerParam = z.object({ code: z.string().regex(/^T\d{2}$/) })

/**
 * Mounted at /api/programmes in server/app.ts.
 * `/public/*` is open to signed-out visitors (fictional catalogue content only); everything
 * else needs a session, and enrolment is checked again in the policy.
 */
export const programmesRoutes = new Hono<AuthEnv>()
  .get('/public', async (c) => c.json(await programmesController.list(), 200))
  .get('/public/sessions', validate('query', sessionsQuery), async (c) =>
    c.json(await programmesController.upcomingSessions(c.req.valid('query').programme), 200),
  )
  .get('/public/trainers', async (c) => c.json(await programmesController.trainers(), 200))
  .get('/public/trainers/:code', validate('param', trainerParam), async (c) =>
    c.json(await programmesController.trainer(c.req.valid('param').code), 200),
  )
  .get('/public/:code', validate('param', programmeCodeParam), async (c) =>
    c.json(await programmesController.detail(c.req.valid('param').code), 200),
  )
  .get('/ping', requireAuth, (c) => c.json(programmesController.ping(), 200))
  .get('/me/enrolments', requireAuth, async (c) =>
    c.json(await programmesController.myEnrolments(c.var.viewer), 200),
  )
  .post('/:code/enrol', requireAuth, validate('param', programmeCodeParam), async (c) =>
    c.json(await programmesController.enrol(c.var.viewer, c.req.valid('param').code), 200),
  )
