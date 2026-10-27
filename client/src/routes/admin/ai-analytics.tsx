import { createFileRoute } from '@tanstack/react-router'
import { AnalyticsWorkspace } from '@/features/ai-analytics/components/AnalyticsWorkspace'

export const Route = createFileRoute('/admin/ai-analytics')({
  component: AnalyticsWorkspace,
})
