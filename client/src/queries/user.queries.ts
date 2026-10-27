import type { ListQuery } from '@shared/schemas'
import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import type { InferResponseType } from 'hono/client'
import { api, unwrap } from '@/lib/api'

export type AdminUser = InferResponseType<typeof api.admin.users.$get, 200>['items'][number]

export const userKeys = {
  all: ['users'] as const,
  adminList: (query: ListQuery) => ['users', 'admin', 'list', query] as const,
}

export const adminUsersQuery = (query: ListQuery) =>
  queryOptions({
    queryKey: userKeys.adminList(query),
    queryFn: () =>
      unwrap(
        api.admin.users.$get({
          query: { page: String(query.page), pageSize: String(query.pageSize) },
        }),
      ),
    placeholderData: keepPreviousData,
  })
