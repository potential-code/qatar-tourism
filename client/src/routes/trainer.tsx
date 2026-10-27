import { createFileRoute } from '@tanstack/react-router'
import { PortalShell } from '@/components/layout/PortalShell'
import { requireRole } from '@/lib/route-guards'

/** Trainer portal layout. Pages live in routes/trainer/ and compose features/. */
export const Route = createFileRoute('/trainer')({
  beforeLoad: requireRole('trainer'),
  component: () => <PortalShell portal="trainer" />,
})
