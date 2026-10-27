import { createFileRoute } from '@tanstack/react-router'
import { TrainerSessionsPage } from '@/features/trainer-workspace/components/sessions/TrainerSessionsPage'

export const Route = createFileRoute('/trainer/sessions/')({
  component: TrainerSessionsPage,
})
