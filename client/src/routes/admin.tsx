import { createFileRoute } from '@tanstack/react-router'
import { PortalShell } from '@/components/layout/PortalShell'
import { requireRole } from '@/lib/route-guards'

/** Admin portal layout. Pages live in routes/admin/ and compose features/. */
export const Route = createFileRoute('/admin')({
  beforeLoad: requireRole('admin'),
  component: () => <PortalShell portal="admin" />,
})
