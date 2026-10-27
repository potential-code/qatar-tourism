import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { validate } from '@server/middleware/validate.middleware'
import { actorOf } from '@server/modules/sessions/actor'
import { sessionIdParam } from '@shared/schemas/admin-catalogue'
import { changeRequestDecisionInput } from '@shared/schemas/booking-rsvp'
import { Hono } from 'hono'
import { z } from 'zod'
import * as controller from './admin-sessions.controller'

const rsvpIdParam = z.object({ rsvpId: z.uuid() })

/**
 * Mounted at /api/admin/sessions. Admin only. Editing, rescheduling and cancelling reuse the
 * trainer scheduling flow owned by the sessions module (brief §14); the one write here is the
 * decision on a learner's late change request, which is audited and notified.
 */
export const adminSessionsRoutes = new Hono<AuthEnv>()
  .use(requireAuth, requireRole('admin'))
  .get('/ping', (c) => c.json({ module: 'admin-sessions' as const, status: 'ok' as const }, 200))
  .get('/', async (c) => c.json(await controller.list(), 200))
  .get('/change-requests', async (c) => c.json(await controller.changeRequestList(), 200))
  .post(
    '/change-requests/:rsvpId',
    validate('param', rsvpIdParam),
    validate('json', changeRequestDecisionInput),
    async (c) =>
      c.json(
        await controller.decideChangeRequest(
          actorOf(c),
          c.req.valid('param').rsvpId,
          c.req.valid('json'),
        ),
        200,
      ),
  )
  .get('/:sessionId', validate('param', sessionIdParam), async (c) =>
    c.json(await controller.detail(c.req.valid('param').sessionId), 200),
  )
