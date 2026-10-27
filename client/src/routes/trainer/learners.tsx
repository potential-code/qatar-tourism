import { createFileRoute } from '@tanstack/react-router'
import { AssignedLearnersPage } from '@/features/trainer-workspace/components/learners/AssignedLearnersPage'

export const Route = createFileRoute('/trainer/learners')({
  component: AssignedLearnersPage,
})
