import type { ListQuery } from '@shared/schemas'
import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import * as users from '@/services/users.service'

export type AdminUser = users.UserListItem

export const userKeys = {
  all: ['users'] as const,
  adminList: (query: ListQuery) => ['users', 'admin', 'list', query] as const,
}

export const adminUsersQuery = (query: ListQuery) =>
  queryOptions({
    queryKey: userKeys.adminList(query),
    queryFn: () => users.listUsers({ page: query.page, pageSize: query.pageSize }),
    placeholderData: keepPreviousData,
  })
