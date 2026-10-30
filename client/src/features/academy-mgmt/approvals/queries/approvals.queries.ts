import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import * as approvals from '@/services/approvals.service'

export type { ApprovalRow } from '@/services/approvals.service'

export const approvalKeys = {
  all: ['admin', 'approvals'] as const,
  list: (filter: approvals.ApprovalFilter) => [...approvalKeys.all, 'list', filter] as const,
}

export const approvalsQuery = (filter: approvals.ApprovalFilter) =>
  queryOptions({
    queryKey: approvalKeys.list(filter),
    queryFn: () => approvals.listApprovals(filter),
    placeholderData: (previous) => previous,
  })

/** A decision changes the learner's view, the dashboard counts and reports, so refresh them all. */
export function useDecideApproval() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      requestId: string
      decision: 'approve' | 'reject' | 'request_info'
      reason?: string
      recognisedAmount?: number
    }) =>
      approvals.decideApproval(input.requestId, {
        decision: input.decision,
        reason: input.reason,
        recognisedAmount: input.recognisedAmount,
      }),
    onSuccess: () => queryClient.invalidateQueries(),
  })
}
