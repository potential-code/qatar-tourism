import { PortalShell } from '@/components/layout/PortalShell'
import { NotificationBell } from '@/features/notifications/components/NotificationBell'
import { useLearnerNavContext } from '../hooks/useLearnerNavContext'

/** Learner portal frame: the shared shell with the learner's bell and programme-aware nav. */
export function LearnerPortal() {
  const navContext = useLearnerNavContext()
  return (
    <PortalShell portal="learner" notifications={<NotificationBell />} navContext={navContext} />
  )
}
