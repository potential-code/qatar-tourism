import { createFileRoute } from '@tanstack/react-router'
import { AuditPage } from '@/features/academy-mgmt/audit/components/AuditPage'

export const Route = createFileRoute('/admin/manage/audit')({
  component: AuditPage,
})
