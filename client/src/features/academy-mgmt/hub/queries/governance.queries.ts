import type { AdminAuditQuery } from '@shared/schemas/admin-governance'
import { queryOptions } from '@tanstack/react-query'
import { unwrap } from '@/lib/api'
import { adminApi } from './admin-api'

export const governanceKeys = {
  all: ['admin', 'governance'] as const,
  overview: () => [...governanceKeys.all, 'overview'] as const,
  permissions: () => [...governanceKeys.all, 'permissions'] as const,
  integrations: () => [...governanceKeys.all, 'integrations'] as const,
  audit: (query: Partial<AdminAuditQuery>) => [...governanceKeys.all, 'audit', query] as const,
}

export const hubOverviewQuery = () =>
  queryOptions({
    queryKey: governanceKeys.overview(),
    queryFn: () => unwrap(adminApi.governance.overview.$get()),
  })

export const permissionsQuery = () =>
  queryOptions({
    queryKey: governanceKeys.permissions(),
    queryFn: () => unwrap(adminApi.governance.permissions.$get()),
    staleTime: 5 * 60_000,
  })

export const integrationsQuery = () =>
  queryOptions({
    queryKey: governanceKeys.integrations(),
    queryFn: () => unwrap(adminApi.governance.integrations.$get()),
  })

/** Query params as strings for the RPC client (empty values dropped). */
export function toQueryParams(query: Record<string, string | number | undefined>) {
  return Object.fromEntries(
    Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => [k, String(v)]),
  )
}

export const auditQuery = (query: Partial<AdminAuditQuery>) =>
  queryOptions({
    queryKey: governanceKeys.audit(query),
    queryFn: () => unwrap(adminApi.governance.audit.$get({ query: toQueryParams(query) as never })),
    placeholderData: (previous) => previous,
  })

export async function exportAuditCsv(query: Partial<AdminAuditQuery>) {
  const { page: _page, pageSize: _size, ...filters } = query
  return adminApi.governance.audit.export.$get({ query: toQueryParams(filters) as never })
}
