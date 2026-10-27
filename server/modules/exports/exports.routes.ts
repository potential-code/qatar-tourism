import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { validate } from '@server/middleware/validate.middleware'
import { PROGRAMME_CODES } from '@shared/constants'
import { Hono } from 'hono'
import { z } from 'zod'
import { actorOf } from '../sessions/actor'
import * as exportsController from './exports.controller'
import { exportsPingRoles } from './exports.policy'
import type { CsvExport } from './exports.service'

const sessionParam = z.object({ sessionId: z.uuid() })
const programmeQuery = z.object({ programme: z.enum(PROGRAMME_CODES) })

const csvHeaders = (file: CsvExport) => ({
  'Content-Type': 'text/csv; charset=utf-8',
  'Content-Disposition': `attachment; filename="${file.filename}"`,
  'Cache-Control': 'no-store',
  'X-Export-Rows': String(file.rows),
})

/**
 * Mounted at /api/exports. No role gate on the router on purpose: a blocked attempt must reach
 * the service so it is answered with the §11 message AND recorded as a denied audit event.
 */
export const exportsRoutes = new Hono<AuthEnv>()
  .use(requireAuth)
  .get('/ping', requireRole(...exportsPingRoles), (c) => c.json(exportsController.ping(), 200))
  .get('/sessions/:sessionId/marks', validate('param', sessionParam), async (c) => {
    const file = await exportsController.sessionMarks(actorOf(c), c.req.valid('param').sessionId)
    return c.body(file.csv, 200, csvHeaders(file))
  })
  .get('/sessions/:sessionId/personal', validate('param', sessionParam), async (c) => {
    const file = await exportsController.sessionPersonal(actorOf(c), c.req.valid('param').sessionId)
    return c.body(file.csv, 200, csvHeaders(file))
  })
  .get('/learners', validate('query', programmeQuery), async (c) => {
    const file = await exportsController.programmeLearners(
      actorOf(c),
      c.req.valid('query').programme,
    )
    return c.body(file.csv, 200, csvHeaders(file))
  })
