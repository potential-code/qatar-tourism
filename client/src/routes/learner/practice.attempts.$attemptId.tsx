import { createFileRoute } from '@tanstack/react-router'
import { AttemptResult } from '@/features/roleplay/components/AttemptResult'

export const Route = createFileRoute('/learner/practice/attempts/$attemptId')({
  component: function AttemptResultRoute() {
    const { attemptId } = Route.useParams()
    return <AttemptResult attemptId={attemptId} />
  },
})
