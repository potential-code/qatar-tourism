import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { validate } from '@server/middleware/validate.middleware'
import { demoResetInput } from '@shared/schemas'
import { Hono } from 'hono'
import * as demoController from './demo.controller'
import { DEMO_RESET_ROLES } from './demo.policy'

/** Mounted at /api/demo. */
export const demoRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get('/meta', async (c) => c.json(await demoController.getMeta(), 200))
  .post('/reset', requireRole(...DEMO_RESET_ROLES), validate('json', demoResetInput), async (c) =>
    c.json(await demoController.reset(c), 200),
  )
