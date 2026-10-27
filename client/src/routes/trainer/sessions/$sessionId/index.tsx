import { createFileRoute } from '@tanstack/react-router'
import { SessionDetailPage } from '@/features/trainer-workspace/components/sessions/SessionDetailPage'

export const Route = createFileRoute('/trainer/sessions/$sessionId/')({
  component: function SessionDetailRoute() {
    const { sessionId } = Route.useParams()
    return <SessionDetailPage sessionId={sessionId} />
  },
})
