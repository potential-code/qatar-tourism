import type { AdminApiType } from '@server/modules/admin-api/admin-api.routes'
import { hc } from 'hono/client'
import { env } from '@/config/env'

/**
 * Typed client for the Academy Management API at /api/admin (programmes, paths, courses,
 * trainers, sessions, assessments, governance). A per-domain client (docs/DECISIONS.md), built
 * from the router's own type with a type-only import, so it needs nothing from `AppType`.
 * `/api/admin/users` is part of `AppType` and stays on `api.admin.users`.
 */
export const adminApi = hc<AdminApiType>(`${env.VITE_API_URL}/api/admin`, {
  init: { credentials: 'include' },
})
