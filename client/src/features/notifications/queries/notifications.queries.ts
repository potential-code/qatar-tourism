import type { ProgrammeCode } from '@shared/constants'
import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import * as notifications from '@/services/notifications.service'

export const notificationKeys = {
  all: ['notifications'] as const,
  mine: (programme?: ProgrammeCode) =>
    programme
      ? ([...notificationKeys.all, 'mine', programme] as const)
      : ([...notificationKeys.all, 'mine'] as const),
  log: (filter: LogFilter) => [...notificationKeys.all, 'log', filter] as const,
}

export type LogFilter = { sessionId?: string; eventId?: string; channel?: 'in_app' | 'email' }

/**
 * The bell polls gently so a trainer's reschedule shows up for the learner without a reload. A
 * learner's bell passes the active programme; a trainer's passes none.
 */
export const myNotificationsQuery = (programme?: ProgrammeCode) =>
  queryOptions({
    queryKey: notificationKeys.mine(programme),
    queryFn: () => notifications.listMine({ programme }),
    refetchInterval: 30_000,
  })

export const notificationLogQuery = (filter: LogFilter) =>
  queryOptions({
    queryKey: notificationKeys.log(filter),
    queryFn: () => notifications.listLog(filter),
    placeholderData: keepPreviousData,
  })

/** Marks the given ids read, or everything the bell shows for `programme` when none are given. */
export function useMarkRead(programme?: ProgrammeCode) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids?: string[]) => notifications.markRead(ids, { programme }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.mine() }),
  })
}
