import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { validate } from '@server/middleware/validate.middleware'
import { askInput } from '@shared/schemas/admin-ai'
import { Hono } from 'hono'
import * as aiAnalyticsController from './ai-analytics.controller'
import { AI_ANALYTICS_ROLES } from './ai-analytics.policy'

/**
 * Mounted at /api/ai-analytics. The Demo analytics assistant: admin only and read-only. `/ask`
 * is a POST only because the question is a body; it never writes.
 */
export const aiAnalyticsRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get('/ping', (c) => c.json(aiAnalyticsController.ping(), 200))
  .get('/prompts', requireRole(...AI_ANALYTICS_ROLES), (c) =>
    c.json(aiAnalyticsController.prompts(), 200),
  )
  .post('/ask', requireRole(...AI_ANALYTICS_ROLES), validate('json', askInput), async (c) =>
    c.json(await aiAnalyticsController.ask(c.req.valid('json').question), 200),
  )
