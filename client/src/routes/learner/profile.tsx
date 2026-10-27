import { createFileRoute } from '@tanstack/react-router'
import { ProfilePage } from '@/features/profile/components/ProfilePage'

/** Learner Profile (brief §5 navigation "Profile"; §4 edits). The /learner layout guards the role. */
export const Route = createFileRoute('/learner/profile')({
  component: ProfilePage,
})
