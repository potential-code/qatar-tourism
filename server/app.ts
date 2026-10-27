import { env } from '@server/config/env'
import { HttpError } from '@server/lib/errors'
import { notFound, onError } from '@server/middleware/error.middleware'
import { requestLogger } from '@server/middleware/logger.middleware'
import { globalRateLimit } from '@server/middleware/rate-limit.middleware'
import { aiAnalyticsRoutes } from '@server/modules/ai-analytics/ai-analytics.routes'
import { aiPathRoutes } from '@server/modules/ai-path/ai-path.routes'
import { analyticsRoutes } from '@server/modules/analytics/analytics.routes'
import { assessmentsRoutes } from '@server/modules/assessments/assessments.routes'
import { assignmentsRoutes } from '@server/modules/assignments/assignments.routes'
import { attendanceRoutes } from '@server/modules/attendance/attendance.routes'
import { auditRoutes } from '@server/modules/audit/audit.routes'
import { authRoutes } from '@server/modules/auth/auth.routes'
import { certificatesRoutes } from '@server/modules/certificates/certificates.routes'
import { coursesRoutes } from '@server/modules/courses/courses.routes'
import { demoRoutes } from '@server/modules/demo/demo.routes'
import { enrolmentsRoutes } from '@server/modules/enrolments/enrolments.routes'
import { exportsRoutes } from '@server/modules/exports/exports.routes'
import { healthRoutes } from '@server/modules/health/health.routes'
import { meRoutes } from '@server/modules/me/me.routes'
import { notificationsRoutes } from '@server/modules/notifications/notifications.routes'
import { organisationsRoutes } from '@server/modules/organisations/organisations.routes'
import { pathsRoutes } from '@server/modules/paths/paths.routes'
import { profilesRoutes } from '@server/modules/profiles/profiles.routes'
import { programmesRoutes } from '@server/modules/programmes/programmes.routes'
import { progressRoutes } from '@server/modules/progress/progress.routes'
import { reportsRoutes } from '@server/modules/reports/reports.routes'
import { roleplayRoutes } from '@server/modules/roleplay/roleplay.routes'
import { rsvpsRoutes } from '@server/modules/rsvps/rsvps.routes'
import { scormRoutes } from '@server/modules/scorm/scorm.routes'
import { sessionsRoutes } from '@server/modules/sessions/sessions.routes'
import { adminUserRoutes } from '@server/modules/users/users.routes'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { cors } from 'hono/cors'
import { csrf } from 'hono/csrf'
import { requestId } from 'hono/request-id'
import { secureHeaders } from 'hono/secure-headers'

/**
 * The Hono app, without a port: index.ts serves it, tests call `app.request()`.
 */
export const app = new Hono()

app
  .use(requestId())
  .use(secureHeaders())
  .use(
    '/api/*',
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
      allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      maxAge: 600,
    }),
  )
  .use(csrf({ origin: env.CLIENT_URL }))
  .use(
    bodyLimit({
      maxSize: 1024 * 1024,
      onError: () => {
        throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large')
      },
    }),
  )
  .use('/api/*', globalRateLimit)
  .use(requestLogger)

app.onError(onError)
app.notFound(notFound)

app.route('/api/auth', authRoutes)

// Chained so the full route tree is one type the client can import (type-only) for `hc`.
const routes = app
  .basePath('/api')
  .route('/health', healthRoutes)
  .route('/me', meRoutes)
  .route('/admin/users', adminUserRoutes)
  .route('/audit', auditRoutes)
  .route('/demo', demoRoutes)
  .route('/profiles', profilesRoutes)
  .route('/organisations', organisationsRoutes)
  .route('/programmes', programmesRoutes)
  .route('/paths', pathsRoutes)
  .route('/courses', coursesRoutes)
  .route('/scorm', scormRoutes)
  .route('/enrolments', enrolmentsRoutes)
  .route('/progress', progressRoutes)
  .route('/assessments', assessmentsRoutes)
  .route('/ai-path', aiPathRoutes)
  .route('/roleplay', roleplayRoutes)
  .route('/sessions', sessionsRoutes)
  .route('/rsvps', rsvpsRoutes)
  .route('/attendance', attendanceRoutes)
  .route('/assignments', assignmentsRoutes)
  .route('/certificates', certificatesRoutes)
  .route('/notifications', notificationsRoutes)
  .route('/reports', reportsRoutes)
  .route('/analytics', analyticsRoutes)
  .route('/ai-analytics', aiAnalyticsRoutes)
  .route('/exports', exportsRoutes)

export type AppType = typeof routes
