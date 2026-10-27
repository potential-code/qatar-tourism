import type { ProgrammeCode } from '@shared/constants'
import type { Role } from '@shared/roles'
import type {
  AdminUserCreateInput,
  AdminUserListQuery,
  AdminUserUpdateInput,
} from '@shared/schemas/admin-users'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api'
import { toQueryParams } from '../../hub/queries/governance.queries'

export const userKeys = {
  all: ['admin', 'users'] as const,
  list: (q: Partial<AdminUserListQuery>) => [...userKeys.all, 'list', q] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
  options: () => [...userKeys.all, 'options'] as const,
}

export const usersListQuery = (q: Partial<AdminUserListQuery>) =>
  queryOptions({
    queryKey: userKeys.list(q),
    queryFn: () => unwrap(api.admin.users.$get({ query: toQueryParams(q) as never })),
    placeholderData: (previous) => previous,
  })

export const userDetailQuery = (userId: string) =>
  queryOptions({
    queryKey: userKeys.detail(userId),
    queryFn: () => unwrap(api.admin.users[':userId'].$get({ param: { userId } })),
  })

export const userOptionsQuery = () =>
  queryOptions({
    queryKey: userKeys.options(),
    queryFn: () => unwrap(api.admin.users.options.$get()),
    staleTime: 5 * 60_000,
  })

export type UserDetail = Awaited<
  ReturnType<NonNullable<ReturnType<typeof userDetailQuery>['queryFn']>>
>
export type UserListItem = Awaited<
  ReturnType<NonNullable<ReturnType<typeof usersListQuery>['queryFn']>>
>['items'][number]

/** Every user write refreshes lists, details, the hub and the reports. */
function useInvalidate() {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: ['admin'] })
}

export function useCreateLearner() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: AdminUserCreateInput) => unwrap(api.admin.users.$post({ json: input })),
    onSuccess: invalidate,
  })
}

export function useUpdateLearner(userId: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: AdminUserUpdateInput) =>
      unwrap(api.admin.users[':userId'].$patch({ param: { userId }, json: input })),
    onSuccess: invalidate,
  })
}

export function useInvite(userId: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: () => unwrap(api.admin.users[':userId'].invite.$post({ param: { userId } })),
    onSuccess: invalidate,
  })
}

export function useEnrol(userId: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (programme: ProgrammeCode) =>
      unwrap(
        api.admin.users[':userId'].enrolments.$post({ param: { userId }, json: { programme } }),
      ),
    onSuccess: invalidate,
  })
}

export function useSetSuspended(userId: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ suspend, reason }: { suspend: boolean; reason: string }) =>
      unwrap(
        suspend
          ? api.admin.users[':userId'].suspend.$post({ param: { userId }, json: { reason } })
          : api.admin.users[':userId'].reactivate.$post({ param: { userId }, json: { reason } }),
      ),
    onSuccess: invalidate,
  })
}

export function useChangeRole(userId: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: { role: Role; reason: string }) =>
      unwrap(api.admin.users[':userId'].role.$patch({ param: { userId }, json: input })),
    onSuccess: invalidate,
  })
}
