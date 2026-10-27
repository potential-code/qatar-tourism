import { createFileRoute } from '@tanstack/react-router'
import { IntegrationsPage } from '@/features/academy-mgmt/integrations/components/IntegrationsPage'

export const Route = createFileRoute('/admin/manage/integrations')({
  component: IntegrationsPage,
})
