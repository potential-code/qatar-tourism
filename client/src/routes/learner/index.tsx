import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '@/components/layout/PageHeader'

export const Route = createFileRoute('/learner/')({
  component: () => <PageHeader title="Overview" description="Coming in Phase 2." />,
})
