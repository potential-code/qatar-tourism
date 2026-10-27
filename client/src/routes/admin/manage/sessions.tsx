import { createFileRoute } from '@tanstack/react-router'
import { SessionsPage } from '@/features/academy-mgmt/sessions/components/SessionsPage'

export const Route = createFileRoute('/admin/manage/sessions')({
  component: SessionsPage,
})
