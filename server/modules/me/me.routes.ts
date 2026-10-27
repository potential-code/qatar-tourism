import { type AuthEnv, requireAuth } from '@server/middleware/auth.middleware'
import { Hono } from 'hono'
import * as meController from './me.controller'

export const meRoutes = new Hono<AuthEnv>().get('/', requireAuth, (c) =>
  c.json(meController.me(c.var.viewer), 200),
)
