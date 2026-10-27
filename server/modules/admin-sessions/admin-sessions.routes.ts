import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { validate } from '@server/middleware/validate.middleware'
import { sessionIdParam } from '@shared/schemas/admin-catalogue'
import { Hono } from 'hono'
import * as controller from './admin-sessions.controller'

/**
 * Mounted at /api/admin/sessions. Admin only and read-only: editing, rescheduling and
 * cancelling reuse the trainer scheduling flow owned by the sessions module (brief §14).
 */
export const adminSessionsRoutes = new Hono<AuthEnv>()
  .use(requireAuth, requireRole('admin'))
  .get('/ping', (c) => c.json({ module: 'admin-sessions' as const, status: 'ok' as const }, 200))
  .get('/', async (c) => c.json(await controller.list(), 200))
  .get('/:sessionId', validate('param', sessionIdParam), async (c) =>
    c.json(await controller.detail(c.req.valid('param').sessionId), 200),
  )
