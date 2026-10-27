import { createFileRoute } from '@tanstack/react-router'
import { TrainerResourcesPage } from '@/features/trainer-workspace/components/resources/TrainerResourcesPage'

export const Route = createFileRoute('/trainer/resources')({
  component: TrainerResourcesPage,
})
