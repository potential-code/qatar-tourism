import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import * as sessions from '@/services/admin/sessions.service'

export type { ChangeRequest, SessionItem } from '@/services/admin/sessions.service'

export const adminSessionsQuery = () =>
  queryOptions({
    queryKey: ['admin', 'sessions', 'list'],
    queryFn: () => sessions.listSessions(),
  })

export const adminSessionDetailQuery = (sessionId: string) =>
  queryOptions({
    queryKey: ['admin', 'sessions', 'detail', sessionId],
    queryFn: () => sessions.getSession(sessionId),
  })

export const changeRequestsQuery = () =>
  queryOptions({
    queryKey: ['admin', 'sessions', 'change-requests'],
    queryFn: () => sessions.listChangeRequests(),
  })

/** Approve or decline a late change request; refreshes the requests and the session list. */
export function useDecideChangeRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { rsvpId: string; decision: 'approved' | 'declined'; note?: string }) =>
      sessions.decideChangeRequest(input.rsvpId, { decision: input.decision, note: input.note }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'sessions'] }),
  })
}
