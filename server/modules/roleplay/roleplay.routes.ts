import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { validate } from '@server/middleware/validate.middleware'
import { idParam } from '@shared/schemas'
import {
  practiceAttemptInput,
  practiceAttemptsQuery,
  practiceTurnInput,
} from '@shared/schemas/practice-roleplay'
import { Hono } from 'hono'
import { z } from 'zod'
import * as roleplayController from './roleplay.controller'
import { PRACTICE_ROLES } from './roleplay.policy'

const scenarioParam = z.object({ key: z.string().min(1).max(60) })

/** Mounted at /api/roleplay. Simulated AI practice (brief §9), learner only. */
export const roleplayRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get('/ping', (c) => c.json(roleplayController.ping(), 200))
  .use(requireRole(...PRACTICE_ROLES))
  .get('/overview', async (c) => c.json(await roleplayController.overview(c.var.viewer), 200))
  .get('/scenarios/:key/demonstration', validate('param', scenarioParam), (c) =>
    c.json(roleplayController.demonstration(c.req.valid('param').key), 200),
  )
  .post('/turn', validate('json', practiceTurnInput), (c) =>
    c.json(roleplayController.nextTurn(c.req.valid('json')), 200),
  )
  .get('/attempts', validate('query', practiceAttemptsQuery), async (c) =>
    c.json(
      await roleplayController.listAttempts(c.var.viewer, c.req.valid('query').scenarioKey),
      200,
    ),
  )
  .get('/attempts/:id', validate('param', idParam), async (c) =>
    c.json(await roleplayController.getAttempt(c.var.viewer, c.req.valid('param').id), 200),
  )
  .post('/attempts', validate('json', practiceAttemptInput), async (c) =>
    c.json(await roleplayController.createAttempt(c.var.viewer, c.req.valid('json')), 201),
  )
