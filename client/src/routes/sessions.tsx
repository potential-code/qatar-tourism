import { createFileRoute } from '@tanstack/react-router'
import { SessionsPage } from '@/features/programmes/components/SessionsPage'

/** Public upcoming sessions (brief §2 "Upcoming sessions"). */
export const Route = createFileRoute('/sessions')({
  component: SessionsPage,
})
