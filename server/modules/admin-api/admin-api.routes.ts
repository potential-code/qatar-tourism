import type { AuthEnv } from '@server/middleware/auth.middleware'
import { Hono } from 'hono'
import { adminAssessmentsRoutes } from '../admin-assessments/admin-assessments.routes'
import { adminCoursesRoutes } from '../admin-courses/admin-courses.routes'
import { adminGovernanceRoutes } from '../admin-governance/admin-governance.routes'
import { adminPathsRoutes } from '../admin-paths/admin-paths.routes'
import { adminProgrammesRoutes } from '../admin-programmes/admin-programmes.routes'
import { adminSessionsRoutes } from '../admin-sessions/admin-sessions.routes'
import { adminTrainersRoutes } from '../admin-trainers/admin-trainers.routes'

/**
 * Academy Management API (brief §14), mounted at /api/admin with ONE line in server/app.ts:
 *
 *   .route('/admin', adminApiRoutes)
 *
 * Every child router applies `requireAuth, requireRole('admin')` itself. `/api/admin/users`
 * stays mounted separately (Phase 1). The client builds a typed `hc` client from this router's
 * type (per-domain client, docs/DECISIONS.md), so it does not depend on `AppType` growing.
 */
export const adminApiRoutes = new Hono<AuthEnv>()
  .route('/programmes', adminProgrammesRoutes)
  .route('/paths', adminPathsRoutes)
  .route('/courses', adminCoursesRoutes)
  .route('/trainers', adminTrainersRoutes)
  .route('/sessions', adminSessionsRoutes)
  .route('/assessments', adminAssessmentsRoutes)
  .route('/governance', adminGovernanceRoutes)

export type AdminApiType = typeof adminApiRoutes
