import { type AuthEnv, requireAuth, requireRole } from '@server/middleware/auth.middleware'
import { validate } from '@server/middleware/validate.middleware'
import { adminCourseUpdateInput, courseIdParam } from '@shared/schemas/admin-catalogue'
import { Hono } from 'hono'
import * as controller from './admin-courses.controller'

const rid = (c: { get: (key: never) => unknown }) =>
  c.get('requestId' as never) as string | undefined

/** Mounted at /api/admin/courses. Admin only (brief §14 Course and content management). */
export const adminCoursesRoutes = new Hono<AuthEnv>()
  .use(requireAuth, requireRole('admin'))
  .get('/ping', (c) => c.json({ module: 'admin-courses' as const, status: 'ok' as const }, 200))
  .get('/', async (c) => c.json(await controller.list(), 200))
  .patch(
    '/:courseId',
    validate('param', courseIdParam),
    validate('json', adminCourseUpdateInput),
    async (c) =>
      c.json(
        await controller.update(
          c.var.viewer,
          c.req.valid('param').courseId,
          c.req.valid('json'),
          rid(c),
        ),
        200,
      ),
  )
