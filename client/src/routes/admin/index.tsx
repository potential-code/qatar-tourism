import { createFileRoute } from '@tanstack/react-router'
import { OverviewDashboard } from '@/features/admin-dashboard/components/OverviewDashboard'
import { filterSearchSchema } from '@/features/admin-dashboard/utils/filters'

export const Route = createFileRoute('/admin/')({
  validateSearch: filterSearchSchema,
  component: OverviewDashboard,
})
