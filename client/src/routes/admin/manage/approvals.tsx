import { createFileRoute } from '@tanstack/react-router'
import { ApprovalsPage } from '@/features/academy-mgmt/approvals/components/ApprovalsPage'

export const Route = createFileRoute('/admin/manage/approvals')({
  component: ApprovalsPage,
})
