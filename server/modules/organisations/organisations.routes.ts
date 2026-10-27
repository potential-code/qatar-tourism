import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { validate } from '@server/middleware/validate.middleware'
import { organisationSearchQuery } from '@shared/schemas'
import { Hono } from 'hono'
import * as organisationsController from './organisations.controller'
import { ORGANISATION_READ_ROLES } from './organisations.policy'

/** Mounted at /api/organisations in server/app.ts. */
export const organisationsRoutes = new Hono<AuthEnv>()
  .use(requireAuth, requireRole(...ORGANISATION_READ_ROLES))
  .get('/ping', (c) => c.json(organisationsController.ping(), 200))
  .get('/', validate('query', organisationSearchQuery), async (c) =>
    c.json(await organisationsController.search(c.req.valid('query')), 200),
  )
