import type { ProgrammeCode } from '@shared/constants'
import type { Role } from '@shared/roles'
import type {
  AdminUserCreateInput,
  AdminUserListQuery,
  AdminUserUpdateInput,
} from '@shared/schemas/admin-users'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import * as users from '@/services/users.service'

export const userKeys = {
  all: ['admin', 'users'] as const,
  list: (q: Partial<AdminUserListQuery>) => [...userKeys.all, 'list', q] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
  options: () => [...userKeys.all, 'options'] as const,
}

export const usersListQuery = (q: Partial<AdminUserListQuery>) =>
  queryOptions({
    queryKey: userKeys.list(q),
    queryFn: () => users.listUsers(q),
    placeholderData: (previous) => previous,
  })

export const userDetailQuery = (userId: string) =>
  queryOptions({
    queryKey: userKeys.detail(userId),
    queryFn: () => users.getUser(userId),
  })

export const userOptionsQuery = () =>
  queryOptions({
    queryKey: userKeys.options(),
    queryFn: users.listOptions,
    staleTime: 5 * 60_000,
  })

export type { UserDetail, UserListItem } from '@/services/users.service'

/** Every user write refreshes lists, details, the hub and the reports. */
function useInvalidate() {
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: ['admin'] })
}

export function useCreateLearner() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: AdminUserCreateInput) => users.createLearner(input),
    onSuccess: invalidate,
  })
}

export function useUpdateLearner(userId: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: AdminUserUpdateInput) => users.updateLearner(userId, input),
    onSuccess: invalidate,
  })
}

export function useInvite(userId: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: () => users.resendInvite(userId),
    onSuccess: invalidate,
  })
}

export function useEnrol(userId: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (programme: ProgrammeCode) => users.enrolLearner(userId, programme),
    onSuccess: invalidate,
  })
}

export function useSetSuspended(userId: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ suspend, reason }: { suspend: boolean; reason: string }) =>
      suspend ? users.suspendUser(userId, reason) : users.reactivateUser(userId, reason),
    onSuccess: invalidate,
  })
}

/** Lock or unlock a learner account (reason required, audited, simulated). */
export function useSetLocked(userId: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ lock, reason }: { lock: boolean; reason: string }) =>
      lock ? users.lockAccount(userId, reason) : users.unlockAccount(userId, reason),
    onSuccess: invalidate,
  })
}

export function useChangeRole(userId: string) {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (input: { role: Role; reason: string }) => users.changeRole(userId, input),
    onSuccess: invalidate,
  })
}
