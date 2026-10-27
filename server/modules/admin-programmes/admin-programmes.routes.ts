import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { validate } from '@server/middleware/validate.middleware'
import { adminProgrammeUpdate, programmeIdParam } from '@shared/schemas/admin-programmes'
import { Hono } from 'hono'
import * as controller from './admin-programmes.controller'
import { PROGRAMME_ADMIN_ROLES } from './admin-programmes.policy'

/** Mounted at /api/admin/programmes. Admin only (brief §14 Programme management). */
export const adminProgrammesRoutes = new Hono<AuthEnv>()
  .use(requireAuth, requireRole(...PROGRAMME_ADMIN_ROLES))
  .get('/ping', (c) => c.json({ module: 'admin-programmes' as const, status: 'ok' as const }, 200))
  .get('/', async (c) => c.json(await controller.list(), 200))
  .get('/:programmeId', validate('param', programmeIdParam), async (c) =>
    c.json(await controller.detail(c.req.valid('param').programmeId), 200),
  )
  .patch(
    '/:programmeId',
    validate('param', programmeIdParam),
    validate('json', adminProgrammeUpdate),
    async (c) =>
      c.json(
        await controller.update(
          c.var.viewer,
          c.req.valid('param').programmeId,
          c.req.valid('json'),
          c.get('requestId' as never) as string | undefined,
        ),
        200,
      ),
  )
