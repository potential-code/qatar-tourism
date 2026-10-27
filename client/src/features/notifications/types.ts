import type { myNotificationsQuery, notificationLogQuery } from './queries/notifications.queries'

type LogData = Awaited<
  ReturnType<
    Extract<ReturnType<typeof notificationLogQuery>['queryFn'], (...args: never[]) => unknown>
  >
>
type MineData = Awaited<
  ReturnType<
    Extract<ReturnType<typeof myNotificationsQuery>['queryFn'], (...args: never[]) => unknown>
  >
>

export type LogRow = LogData['items'][number]
export type InboxItem = MineData['items'][number]
