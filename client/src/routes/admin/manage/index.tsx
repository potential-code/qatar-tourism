import { createFileRoute } from '@tanstack/react-router'
import { HubOverview } from '@/features/academy-mgmt/hub/components/HubOverview'

export const Route = createFileRoute('/admin/manage/')({
  component: HubOverview,
})
