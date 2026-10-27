import { createFileRoute } from '@tanstack/react-router'
import { RolesPage } from '@/features/academy-mgmt/roles/components/RolesPage'

export const Route = createFileRoute('/admin/manage/roles')({
  component: RolesPage,
})
