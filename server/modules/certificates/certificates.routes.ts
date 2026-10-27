import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { validate } from '@server/middleware/validate.middleware'
import { certificateReissueInput, certificateRevokeInput } from '@shared/schemas/certificate'
import { certificateCodeParam } from '@shared/schemas/learning-engine'
import { Hono } from 'hono'
import * as controller from './certificates.controller'
import {
  certificateAdminRoles,
  certificatePingRoles,
  certificateReadRoles,
} from './certificates.policy'

/**
 * Mounted at /api/certificates. `/verify/:code` is the one public endpoint (brief §6
 * "verifiable demo certificate record"); everything else needs a session.
 */
export const certificatesRoutes = new Hono<AuthEnv>()
  .get('/verify/:code', validate('param', certificateCodeParam), async (c) =>
    c.json(await controller.verify(c.req.valid('param').code), 200),
  )
  .get('/ping', requireAuth, requireRole(...certificatePingRoles), (c) =>
    c.json(controller.ping(), 200),
  )
  .get('/mine', requireAuth, requireRole('learner'), async (c) =>
    c.json(await controller.mine(c.var.viewer), 200),
  )
  .get(
    '/:code',
    requireAuth,
    requireRole(...certificateReadRoles),
    validate('param', certificateCodeParam),
    async (c) => c.json(await controller.detail(c.var.viewer, c.req.valid('param').code), 200),
  )
  .get(
    '/:code/pdf',
    requireAuth,
    requireRole(...certificateReadRoles),
    validate('param', certificateCodeParam),
    async (c) => {
      const { bytes, filename } = await controller.pdf(c.var.viewer, c.req.valid('param').code)
      return c.body(bytes as Uint8Array<ArrayBuffer>, 200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      })
    },
  )
  .post(
    '/:code/revoke',
    requireAuth,
    requireRole(...certificateAdminRoles),
    validate('param', certificateCodeParam),
    validate('json', certificateRevokeInput),
    async (c) =>
      c.json(
        await controller.revoke(
          c.var.viewer,
          c.req.valid('param').code,
          c.req.valid('json').reason,
        ),
        200,
      ),
  )
  .post(
    '/:code/reissue',
    requireAuth,
    requireRole(...certificateAdminRoles),
    validate('param', certificateCodeParam),
    validate('json', certificateReissueInput),
    async (c) =>
      c.json(
        await controller.reissue(
          c.var.viewer,
          c.req.valid('param').code,
          c.req.valid('json').reason,
        ),
        200,
      ),
  )
