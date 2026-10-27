import { createFileRoute } from '@tanstack/react-router'
import { PracticeOverview } from '@/features/roleplay/components/PracticeOverview'

export const Route = createFileRoute('/learner/practice/')({
  component: PracticeOverview,
})
