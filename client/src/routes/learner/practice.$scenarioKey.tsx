import { createFileRoute } from '@tanstack/react-router'
import { PracticeSession } from '@/features/roleplay/components/PracticeSession'

export const Route = createFileRoute('/learner/practice/$scenarioKey')({
  component: function PracticeSessionRoute() {
    const { scenarioKey } = Route.useParams()
    // Keyed so moving to another scenario starts a fresh session.
    return <PracticeSession key={scenarioKey} scenarioKey={scenarioKey} />
  },
})
