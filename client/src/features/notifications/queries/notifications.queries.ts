import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api'

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
    queryFn: () => unwrap(api.notifications.$get()),
    refetchInterval: 30_000,
  })

export const notificationLogQuery = (filter: LogFilter) =>
  queryOptions({
    queryKey: notificationKeys.log(filter),
    queryFn: () => unwrap(api.notifications.log.$get({ query: filter })),
    placeholderData: keepPreviousData,
  })

export function useMarkRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids?: string[]) => unwrap(api.notifications.read.$post({ json: { ids } })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.mine() }),
  })
}
