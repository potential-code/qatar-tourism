import { useActiveProgramme } from '@/features/learning/hooks/useActiveProgramme'
import { useSession } from '@/hooks/useSession'
import { NotificationInbox } from './NotificationInbox'

/**
 * In-app notification bell for learners and trainers. Mount it in PortalShell's `notifications`
 * slot: `<PortalShell portal="learner" notifications={<NotificationBell />} />`. A learner sees
 * the messages of the programme picked in the top-bar switcher; a trainer sees all of theirs.
 */
export function NotificationBell() {
  const { role } = useSession()
  return role === 'learner' ? <LearnerNotificationBell /> : <NotificationInbox />
}

function LearnerNotificationBell() {
  const { programme, isLoading } = useActiveProgramme()
  return <NotificationInbox programme={programme ?? undefined} ready={!isLoading} />
}
