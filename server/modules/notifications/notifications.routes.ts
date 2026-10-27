import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { withScope } from '@server/middleware/scope.middleware'
import { validate } from '@server/middleware/validate.middleware'
import { notificationLogFilter } from '@shared/schemas/trainer-ops'
import { Hono } from 'hono'
import { z } from 'zod'
import * as notificationsController from './notifications.controller'
import {
  NOTIFICATION_INBOX_ROLES,
  NOTIFICATION_LOG_ROLES,
  notificationsPingRoles,
} from './notifications.policy'

const markReadInput = z.object({ ids: z.array(z.uuid()).max(100).optional() })

/** Mounted at /api/notifications: the in-app bell and the trainer/admin notification log. */
export const notificationsRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get('/ping', requireRole(...notificationsPingRoles), (c) =>
    c.json(notificationsController.ping(), 200),
  )
  .get('/', requireRole(...NOTIFICATION_INBOX_ROLES), async (c) =>
    c.json(await notificationsController.listMine(c.var.viewer.id), 200),
  )
  .post(
    '/read',
    requireRole(...NOTIFICATION_INBOX_ROLES),
    validate('json', markReadInput),
    async (c) =>
      c.json(await notificationsController.markRead(c.var.viewer.id, c.req.valid('json').ids), 200),
  )
  .get(
    '/log',
    requireRole(...NOTIFICATION_LOG_ROLES),
    withScope,
    validate('query', notificationLogFilter),
    async (c) =>
      c.json(await notificationsController.listLog(c.var.scope, c.req.valid('query')), 200),
  )
