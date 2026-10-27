import { createFileRoute } from '@tanstack/react-router'
import { AssignmentsPage } from '@/features/assignments/components/AssignmentsPage'

export const Route = createFileRoute('/learner/assignments/')({
  component: AssignmentsPage,
})
