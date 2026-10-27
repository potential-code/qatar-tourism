import { createFileRoute } from '@tanstack/react-router'
import { PortalShell } from '@/components/layout/PortalShell'
import { NotificationBell } from '@/features/notifications/components/NotificationBell'
import { requireRole } from '@/lib/route-guards'

/** Learner portal layout. Pages live in routes/learner/ and compose features/. */
export const Route = createFileRoute('/learner')({
  beforeLoad: requireRole('learner'),
  component: () => <PortalShell portal="learner" notifications={<NotificationBell />} />,
})
