import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import * as notifications from '@/services/notifications.service'

export const notificationKeys = {
  all: ['notifications'] as const,
  mine: () => [...notificationKeys.all, 'mine'] as const,
  log: (filter: LogFilter) => [...notificationKeys.all, 'log', filter] as const,
}

export type LogFilter = { sessionId?: string; eventId?: string; channel?: 'in_app' | 'email' }

/** The bell polls gently so a trainer's reschedule shows up for the learner without a reload. */
export const myNotificationsQuery = () =>
  queryOptions({
    queryKey: notificationKeys.mine(),
    queryFn: () => notifications.listMine(),
    refetchInterval: 30_000,
  })

export const notificationLogQuery = (filter: LogFilter) =>
  queryOptions({
    queryKey: notificationKeys.log(filter),
    queryFn: () => notifications.listLog(filter),
    placeholderData: keepPreviousData,
  })

export function useMarkRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids?: string[]) => notifications.markRead(ids),
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.mine() }),
  })
}
