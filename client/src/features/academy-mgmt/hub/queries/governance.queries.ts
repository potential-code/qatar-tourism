import type { AdminAuditQuery } from '@shared/schemas/admin-governance'
import { queryOptions } from '@tanstack/react-query'
import { downloadCsv } from '@/lib/download'
import * as governance from '@/services/admin/governance.service'

export const governanceKeys = {
  all: ['admin', 'governance'] as const,
  overview: () => [...governanceKeys.all, 'overview'] as const,
  permissions: () => [...governanceKeys.all, 'permissions'] as const,
  integrations: () => [...governanceKeys.all, 'integrations'] as const,
  audit: (query: Partial<AdminAuditQuery>) => [...governanceKeys.all, 'audit', query] as const,
}

export const hubOverviewQuery = () =>
  queryOptions({ queryKey: governanceKeys.overview(), queryFn: () => governance.getHubOverview() })

export const permissionsQuery = () =>
  queryOptions({
    queryKey: governanceKeys.permissions(),
    queryFn: () => governance.getPermissions(),
    staleTime: 5 * 60_000,
  })

export const integrationsQuery = () =>
  queryOptions({
    queryKey: governanceKeys.integrations(),
    queryFn: () => governance.listIntegrations(),
  })

/**
 * Query params as strings (empty values dropped). Still used by the users feature's queries
 * until that feature moves to its service.
 */
export function toQueryParams(query: Record<string, string | number | undefined>) {
  return Object.fromEntries(
    Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => [k, String(v)]),
  )
}

/** Drops unset filters, so cache keys and service input stay minimal. */
const defined = (query: Partial<AdminAuditQuery>): Partial<AdminAuditQuery> =>
  Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined && v !== ''))

export const auditQuery = (query: Partial<AdminAuditQuery>) =>
  queryOptions({
    queryKey: governanceKeys.audit(defined(query)),
    queryFn: () => governance.listAudit(defined(query)),
    placeholderData: (previous) => previous,
  })

/** Builds the audit CSV for the active filters (audited by the service) and saves it. */
export async function exportAuditLog(query: Partial<AdminAuditQuery>) {
  const { page: _page, pageSize: _size, ...filters } = defined(query)
  const result = await governance.exportAuditCsv(filters)
  downloadCsv(result.csv, result.filename)
  return result.filename
}
