import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { Hono } from 'hono'
import * as notificationsController from './notifications.controller'
import { notificationsPingRoles } from './notifications.policy'

/** Mounted at /api/notifications in server/app.ts. Replace `ping` with the module's real endpoints. */
export const notificationsRoutes = new Hono<AuthEnv>()
  .use(requireAuth, requireRole(...notificationsPingRoles))
  .get('/ping', (c) => c.json(notificationsController.ping(), 200))
