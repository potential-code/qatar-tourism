import { createFileRoute } from '@tanstack/react-router'
import { ProgrammesOverview } from '@/features/academy-mgmt/programmes/components/ProgrammesOverview'

export const Route = createFileRoute('/admin/manage/programmes')({
  component: ProgrammesOverview,
})
