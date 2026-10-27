import { createFileRoute } from '@tanstack/react-router'
import { TrainersPage } from '@/features/academy-mgmt/trainers/components/TrainersPage'

export const Route = createFileRoute('/admin/manage/trainers')({
  component: TrainersPage,
})
