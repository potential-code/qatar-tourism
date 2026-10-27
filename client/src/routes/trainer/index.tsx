import { createFileRoute } from '@tanstack/react-router'
import { TrainerOverviewPage } from '@/features/trainer-workspace/components/overview/TrainerOverviewPage'

export const Route = createFileRoute('/trainer/')({
  component: TrainerOverviewPage,
})
