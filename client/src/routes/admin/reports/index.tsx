import { createFileRoute } from '@tanstack/react-router'
import { ReportsHub } from '@/features/reports/components/ReportsHub'

export const Route = createFileRoute('/admin/reports/')({
  component: ReportsHub,
})
