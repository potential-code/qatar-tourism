import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { unwrap } from '@/lib/api'
import { adminApi } from '../../hub/queries/admin-api'

export const adminSessionsQuery = () =>
  queryOptions({
    queryKey: ['admin', 'sessions', 'list'],
    queryFn: () => unwrap(adminApi.sessions.$get()),
  })

export const adminSessionDetailQuery = (sessionId: string) =>
  queryOptions({
    queryKey: ['admin', 'sessions', 'detail', sessionId],
    queryFn: () => unwrap(adminApi.sessions[':sessionId'].$get({ param: { sessionId } })),
  })

export type SessionItem = Awaited<
  ReturnType<NonNullable<ReturnType<typeof adminSessionsQuery>['queryFn']>>
>['items'][number]

export const changeRequestsQuery = () =>
  queryOptions({
    queryKey: ['admin', 'sessions', 'change-requests'],
    queryFn: () => unwrap(adminApi.sessions['change-requests'].$get()),
  })

export type ChangeRequest = Awaited<
  ReturnType<NonNullable<ReturnType<typeof changeRequestsQuery>['queryFn']>>
>['items'][number]

/** Approve or decline a late change request; refreshes the requests and the session list. */
export function useDecideChangeRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { rsvpId: string; decision: 'approved' | 'declined'; note?: string }) =>
      unwrap(
        adminApi.sessions['change-requests'][':rsvpId'].$post({
          param: { rsvpId: input.rsvpId },
          json: { decision: input.decision, note: input.note },
        }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'sessions'] }),
  })
}
