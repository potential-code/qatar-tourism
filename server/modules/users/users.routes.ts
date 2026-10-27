import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { validate } from '@server/middleware/validate.middleware'
import { listQuery } from '@shared/schemas'
import { Hono } from 'hono'
import * as usersController from './users.controller'
import { USER_ADMIN_ROLES } from './users.policy'

/** Mounted at /api/admin/users. Admin only; the first Academy Management read. */
export const adminUserRoutes = new Hono<AuthEnv>()
  .use(requireAuth, requireRole(...USER_ADMIN_ROLES))
  .get('/', validate('query', listQuery), async (c) =>
    c.json(await usersController.listUsers(c.req.valid('query')), 200),
  )
