import { createFileRoute } from '@tanstack/react-router'
import { LearnerSessionsPage } from '@/features/sessions/components/LearnerSessionsPage'

export const Route = createFileRoute('/learner/sessions')({
  component: LearnerSessionsPage,
})
