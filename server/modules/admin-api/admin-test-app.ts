import { notFound, onError } from '@server/middleware/error.middleware'
import { Hono } from 'hono'
import { requestId } from 'hono/request-id'
import { adminApiRoutes } from './admin-api.routes'

/**
 * Test-only host for the Academy Management API, with the real app's error handler and request
 * id. Agent E may not edit server/app.ts; once the lead mounts `adminApiRoutes` there, tests can
 * import `app` from '@server/app' instead with no other change.
 */
export const adminTestApp = new Hono()
  .use(requestId())
  .basePath('/api')
  .route('/admin', adminApiRoutes)

adminTestApp.onError(onError)
adminTestApp.notFound(notFound)
