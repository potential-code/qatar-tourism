import type { Scope } from '@server/middleware/scope.middleware'
import type { NotificationLogFilter } from '@shared/schemas/trainer-ops'
import * as notificationsService from './notifications.service'

export function ping() {
  return { module: 'notifications' as const, status: 'ok' as const }
}

const iso = (value: Date | null) => (value ? value.toISOString() : null)

export async function listMine(userId: string) {
  const { items, unread } = await notificationsService.listMine(userId)
  return {
    unread,
    items: items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      readAt: iso(item.readAt),
    })),
  }
}

export async function markRead(userId: string, ids: string[] | undefined) {
  return notificationsService.markRead(userId, ids && ids.length > 0 ? ids : 'all')
}

export async function listLog(scope: Scope, filter: NotificationLogFilter) {
  const trainerId = scope.kind === 'trainer' ? scope.trainerId : null
  const rows = await notificationsService.listLog(trainerId, filter)
  return {
    items: rows.map((row) => ({
      ...row,
      learnerCode: row.learnerCode ?? 'Unknown',
      createdAt: row.createdAt.toISOString(),
      readAt: iso(row.readAt),
    })),
  }
}
