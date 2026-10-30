import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api-error'
import * as crm from '@/services/crm.service'
import * as crmMapping from '@/services/crm-mapping.service'
import * as crmScenario from '@/services/crm-scenario.service'
import * as access from '@/services/integrations/access.service'
import * as integrations from '@/services/integrations.service'

export const integrationKeys = {
  all: ['admin', 'integrations'] as const,
  snapshot: () => [...integrationKeys.all, 'snapshot'] as const,
  audit: () => [...integrationKeys.all, 'audit'] as const,
  packages: () => [...integrationKeys.all, 'packages'] as const,
  crm: () => [...integrationKeys.all, 'crm'] as const,
}

export const snapshotQuery = () =>
  queryOptions({
    queryKey: integrationKeys.snapshot(),
    queryFn: () => integrations.getIntegrationsSnapshot(),
  })
export const accessAuditQuery = () =>
  queryOptions({ queryKey: integrationKeys.audit(), queryFn: () => access.listAccessAudit() })
export const packagesQuery = () =>
  queryOptions({
    queryKey: integrationKeys.packages(),
    queryFn: () => integrations.listHostedPackages(),
  })
export const summaryQuery = () =>
  queryOptions({
    queryKey: [...integrationKeys.all, 'summary'],
    queryFn: () => integrations.getIntegrationsSummary(),
  })

export const crmConnectionQuery = () =>
  queryOptions({
    queryKey: [...integrationKeys.crm(), 'connection'],
    queryFn: () => crm.getCrmConnection(),
  })
export const crmCardQuery = () =>
  queryOptions({ queryKey: [...integrationKeys.crm(), 'card'], queryFn: () => crm.getCrmCard() })
export const crmEventsQuery = () =>
  queryOptions({
    queryKey: [...integrationKeys.crm(), 'events'],
    queryFn: () => crm.listCrmEvents(),
  })
export const crmMappingsQuery = () =>
  queryOptions({
    queryKey: [...integrationKeys.crm(), 'mappings'],
    queryFn: () => crmMapping.listCrmMappings(),
  })
export const identityReviewQuery = () =>
  queryOptions({
    queryKey: [...integrationKeys.crm(), 'identity'],
    queryFn: () => crmMapping.listIdentityReview(),
  })
export const scenarioQuery = () =>
  queryOptions({
    queryKey: [...integrationKeys.crm(), 'scenario'],
    queryFn: () => crmScenario.getCrmScenario(),
  })

export const errorMessage = (error: unknown): string =>
  error instanceof ApiError
    ? (error.details as { issues?: { message: string }[] } | undefined)?.issues?.[0]?.message ||
      error.message
    : error instanceof Error
      ? error.message
      : 'The change could not be saved.'

/**
 * A mutation that refreshes everything on this page, the audit trail and the dashboard cards, and
 * reports success or failure in a toast (the caller may also read `error` for inline messages).
 */
export function useIntegrationMutation<TInput = void, TResult = unknown>(
  fn: (input: TInput) => Promise<TResult>,
  success?: string | ((result: TResult) => string),
) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (result) => {
      client.invalidateQueries({ queryKey: ['admin'] })
      const text = typeof success === 'function' ? success(result) : success
      if (text) toast.success(text)
    },
    onError: (error) => toast.error(errorMessage(error)),
  })
}
