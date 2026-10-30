import { createFileRoute } from '@tanstack/react-router'
import { SessionsPage } from '@/features/academy-mgmt/sessions/components/SessionsPage'

export const Route = createFileRoute('/admin/manage/sessions')({
  // `?view=waitlist` is the list the dashboard's Waitlisted learners count opens.
  validateSearch: (raw): { view?: 'waitlist' } =>
    raw.view === 'waitlist' ? { view: 'waitlist' } : {},
  component: SessionsRoute,
})

function SessionsRoute() {
  const { view } = Route.useSearch()
  return <SessionsPage view={view} />
}
