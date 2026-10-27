import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { validate } from '@server/middleware/validate.middleware'
import { adminAssessmentUpdateInput, assessmentIdParam } from '@shared/schemas/admin-catalogue'
import { Hono } from 'hono'
import * as controller from './admin-assessments.controller'

const rid = (c: { get: (key: never) => unknown }) =>
  c.get('requestId' as never) as string | undefined

/** Mounted at /api/admin/assessments. Admin only (brief §14 Assessment and rubric management). */
export const adminAssessmentsRoutes = new Hono<AuthEnv>()
  .use(requireAuth, requireRole('admin'))
  .get('/ping', (c) => c.json({ module: 'admin-assessments' as const, status: 'ok' as const }, 200))
  .get('/', async (c) => c.json(await controller.list(), 200))
  .patch(
    '/:assessmentId',
    validate('param', assessmentIdParam),
    validate('json', adminAssessmentUpdateInput),
    async (c) => {
      const body = c.req.valid('json')
      return c.json(
        await controller.updatePass(
          c.var.viewer,
          c.req.valid('param').assessmentId,
          body.passPercent,
          body.reason,
          rid(c),
        ),
        200,
      )
    },
  )
