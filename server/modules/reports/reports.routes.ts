import { HttpError } from '@server/lib/errors'
import { logger } from '@server/lib/logger'
import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { validate } from '@server/middleware/validate.middleware'
import { EXPORT_BLOCKED_MESSAGE } from '@shared/permissions'
import { reportExportQuery, reportPageQuery, reportParam } from '@shared/schemas/admin-reports'
import { Hono } from 'hono'
import { createMiddleware } from 'hono/factory'
import * as reportsController from './reports.controller'
import { canExportReports, REPORT_ROLES } from './reports.policy'
import * as reportsService from './reports.service'

const requestIdOf = (c: { get: (key: never) => unknown }) =>
  c.get('requestId' as never) as string | undefined

/**
 * Export gate (brief §11): a role without export rights gets the verbatim blocked message, and
 * the attempt is audited as denied. Enforced here, in the API, not by hiding a button.
 */
const requireExport = createMiddleware<AuthEnv>(async (c, next) => {
  if (!canExportReports(c.var.viewer.role)) {
    // The denial is the answer; a failed audit write must not turn it into a 500.
    await reportsService
      .recordExport(
        c.var.viewer,
        { report: c.req.param('report') ?? 'unknown', format: 'csv' },
        'denied',
        requestIdOf(c),
      )
      .catch((error: unknown) => logger.error({ err: error }, 'Could not audit a denied export'))
    throw new HttpError(403, 'EXPORT_BLOCKED', EXPORT_BLOCKED_MESSAGE)
  }
  await next()
})

/** Mounted at /api/reports. Admin only, except the Phase 1 `/ping`. */
export const reportsRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get('/ping', (c) => c.json(reportsController.ping(), 200))
  .get(
    '/:report/export',
    requireExport,
    validate('param', reportParam),
    validate('query', reportExportQuery),
    async (c) => {
      const viewer = c.var.viewer
      const result = await reportsController.exportCsv(
        viewer,
        c.req.valid('param').report,
        c.req.valid('query'),
      )
      await reportsService.recordExport(viewer, result.audit, 'allowed', requestIdOf(c))
      return c.body(result.csv, 200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Cache-Control': 'no-store',
        'X-Export-Rows': String(result.audit.rows),
      })
    },
  )
  .get(
    '/:report',
    requireRole(...REPORT_ROLES),
    validate('param', reportParam),
    validate('query', reportPageQuery),
    async (c) =>
      c.json(
        await reportsController.page(
          c.var.viewer,
          c.req.valid('param').report,
          c.req.valid('query'),
        ),
        200,
      ),
  )
