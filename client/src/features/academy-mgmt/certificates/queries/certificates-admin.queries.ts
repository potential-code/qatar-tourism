import type { DemoSettings } from '@shared/types/db'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import * as certificates from '@/services/certificates.service'
import * as cpd from '@/services/cpd.service'
import * as external from '@/services/external-certificates.service'

export const certAdminKeys = {
  all: ['admin', 'certificates'] as const,
  clock: () => [...certAdminKeys.all, 'clock'] as const,
  rules: () => [...certAdminKeys.all, 'rules'] as const,
  templates: () => [...certAdminKeys.all, 'templates'] as const,
  issued: (filter: object) => [...certAdminKeys.all, 'issued', filter] as const,
  renewals: () => [...certAdminKeys.all, 'renewals'] as const,
  reviews: (status: string) => [...certAdminKeys.all, 'reviews', status] as const,
}

export const clockQuery = () =>
  queryOptions({ queryKey: certAdminKeys.clock(), queryFn: () => cpd.getClock() })

export const rulesQuery = () =>
  queryOptions({ queryKey: certAdminKeys.rules(), queryFn: () => cpd.getRules() })

export const templatesQuery = () =>
  queryOptions({ queryKey: certAdminKeys.templates(), queryFn: () => cpd.listTemplates() })

export const issuedQuery = (filter: { validity?: cpd.ValidityFilter; search?: string }) =>
  queryOptions({
    queryKey: certAdminKeys.issued(filter),
    queryFn: () => cpd.listIssued(filter),
    placeholderData: (previous) => previous,
  })

export const renewalsQuery = () =>
  queryOptions({ queryKey: certAdminKeys.renewals(), queryFn: () => cpd.listRenewals() })

export const reviewsQuery = (status: string) =>
  queryOptions({
    queryKey: certAdminKeys.reviews(status),
    queryFn: () =>
      external.listForReview({
        status: status as external.ExternalFilter['status'],
      }),
  })

/** Everything derived from credentials or the clock refreshes together. */
function useRefreshAll() {
  const client = useQueryClient()
  return () => client.invalidateQueries()
}

export function useAdvanceClock() {
  const refresh = useRefreshAll()
  return useMutation({ mutationFn: (days: number) => cpd.advanceClock(days), onSuccess: refresh })
}

export function useResetClock() {
  const refresh = useRefreshAll()
  return useMutation({ mutationFn: () => cpd.resetClock(), onSuccess: refresh })
}

export function useUpdateRules() {
  const refresh = useRefreshAll()
  return useMutation({
    mutationFn: (patch: Partial<DemoSettings>) => cpd.updateRules(patch),
    onSuccess: refresh,
  })
}

export function useRevokeCredential() {
  const refresh = useRefreshAll()
  return useMutation({
    mutationFn: ({ code, reason }: { code: string; reason: string }) =>
      certificates.revoke(code, { reason }),
    onSuccess: refresh,
  })
}

export function useReissueCredential() {
  const refresh = useRefreshAll()
  return useMutation({
    mutationFn: ({ code, reason }: { code: string; reason: string }) =>
      certificates.reissue(code, { reason }),
    onSuccess: refresh,
  })
}

export function useReviewExternal() {
  const refresh = useRefreshAll()
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: external.ReviewDecision }) =>
      external.review(id, decision),
    onSuccess: refresh,
  })
}
