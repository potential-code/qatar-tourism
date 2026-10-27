import { createFileRoute } from '@tanstack/react-router'
import { TrainersPage } from '@/features/programmes/components/TrainersPage'

export const Route = createFileRoute('/trainers/')({
  component: TrainersPage,
})
