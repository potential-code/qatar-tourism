import { createFileRoute } from '@tanstack/react-router'
import { SessionFormPage } from '@/features/trainer-workspace/components/form/SessionFormPage'

export const Route = createFileRoute('/trainer/sessions/new')({
  component: () => <SessionFormPage />,
})
