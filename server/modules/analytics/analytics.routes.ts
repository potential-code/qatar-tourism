import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { validate } from '@server/middleware/validate.middleware'
import { reportFilters } from '@shared/schemas'
import { Hono } from 'hono'
import * as analyticsController from './analytics.controller'
import { ANALYTICS_ROLES } from './analytics.policy'

/** Mounted at /api/analytics. Everything except `/ping` is admin only. */
export const analyticsRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get('/ping', (c) => c.json(analyticsController.ping(), 200))
  .get('/overview', requireRole(...ANALYTICS_ROLES), validate('query', reportFilters), async (c) =>
    c.json(await analyticsController.overview(c.req.valid('query')), 200),
  )
  .get('/filter-options', requireRole(...ANALYTICS_ROLES), async (c) =>
    c.json(await analyticsController.filterOptions(), 200),
  )
