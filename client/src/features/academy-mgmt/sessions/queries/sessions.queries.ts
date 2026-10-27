import { queryOptions } from '@tanstack/react-query'
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
