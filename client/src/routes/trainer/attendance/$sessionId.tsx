import { createFileRoute } from '@tanstack/react-router'
import { RosterPage } from '@/features/trainer-workspace/components/attendance/RosterPage'

export const Route = createFileRoute('/trainer/attendance/$sessionId')({
  component: function RosterRoute() {
    const { sessionId } = Route.useParams()
    return <RosterPage sessionId={sessionId} />
  },
})
