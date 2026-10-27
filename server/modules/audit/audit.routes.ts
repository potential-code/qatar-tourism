import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { validate } from '@server/middleware/validate.middleware'
import { auditQuery } from '@shared/schemas'
import { Hono } from 'hono'
import * as auditController from './audit.controller'
import { AUDIT_VIEW_ROLES } from './audit.policy'

/** Mounted at /api/audit. Admin only. */
export const auditRoutes = new Hono<AuthEnv>()
  .use(requireAuth, requireRole(...AUDIT_VIEW_ROLES))
  .get('/', validate('query', auditQuery), async (c) =>
    c.json(await auditController.listAudit(c.req.valid('query')), 200),
  )
