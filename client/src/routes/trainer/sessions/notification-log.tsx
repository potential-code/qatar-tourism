import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { NotificationLogPage } from '@/features/notifications/components/NotificationLogPage'

const search = z.object({
  sessionId: z.uuid().optional().catch(undefined),
  eventId: z.string().max(200).optional().catch(undefined),
})

export const Route = createFileRoute('/trainer/sessions/notification-log')({
  validateSearch: search,
  component: function NotificationLogRoute() {
    const filter = Route.useSearch()
    return <NotificationLogPage filter={filter} />
  },
})
