import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { validate } from '@server/middleware/validate.middleware'
import { adminAuditExportQuery, adminAuditQuery } from '@shared/schemas/admin-governance'
import { Hono } from 'hono'
import * as controller from './admin-governance.controller'
import { GOVERNANCE_ROLES } from './admin-governance.policy'

const rid = (c: { get: (key: never) => unknown }) =>
  c.get('requestId' as never) as string | undefined

/** Mounted at /api/admin/governance: hub counts, roles and permissions, integrations, audit. */
export const adminGovernanceRoutes = new Hono<AuthEnv>()
  .use(requireAuth, requireRole(...GOVERNANCE_ROLES))
  .get('/ping', (c) => c.json({ module: 'admin-governance' as const, status: 'ok' as const }, 200))
  .get('/overview', async (c) => c.json(await controller.overview(), 200))
  .get('/permissions', (c) => c.json(controller.permissions(), 200))
  .get('/integrations', async (c) => c.json(await controller.integrationList(), 200))
  .get('/audit', validate('query', adminAuditQuery), async (c) =>
    c.json(await controller.auditPage(c.req.valid('query')), 200),
  )
  .get('/audit/export', validate('query', adminAuditExportQuery), async (c) => {
    const result = await controller.auditCsv(c.var.viewer, c.req.valid('query'), rid(c))
    return c.body(result.csv, 200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Cache-Control': 'no-store',
    })
  })
