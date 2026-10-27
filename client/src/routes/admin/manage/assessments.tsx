import { createFileRoute } from '@tanstack/react-router'
import { AssessmentsPage } from '@/features/academy-mgmt/assessments/components/AssessmentsPage'

export const Route = createFileRoute('/admin/manage/assessments')({
  component: AssessmentsPage,
})
