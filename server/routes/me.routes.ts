import * as userController from '@server/controller/user.controller'
import { type AuthEnv, requireAuth } from '@server/middleware/auth.middleware'
import { Hono } from 'hono'

export const meRoutes = new Hono<AuthEnv>().get('/', requireAuth, (c) =>
  c.json(userController.me(c.var.viewer), 200),
)
