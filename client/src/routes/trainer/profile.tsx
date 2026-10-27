import { createFileRoute } from '@tanstack/react-router'
import { TrainerProfilePage } from '@/features/trainer-workspace/components/profile/TrainerProfilePage'

export const Route = createFileRoute('/trainer/profile')({
  component: TrainerProfilePage,
})
