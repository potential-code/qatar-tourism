import * as userController from '@server/controller/user.controller'
import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { validate } from '@server/middleware/validate.middleware'
import { listQuery } from '@shared/schemas'
import { Hono } from 'hono'

export const adminRoutes = new Hono<AuthEnv>()
  .use(requireAuth, requireRole('admin'))
  .get('/users', validate('query', listQuery), async (c) =>
    c.json(await userController.listUsers(c.req.valid('query')), 200),
  )
