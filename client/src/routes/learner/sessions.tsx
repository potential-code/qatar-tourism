import { createFileRoute } from '@tanstack/react-router'
import { programmeSearch } from '@/features/learning/utils/search'
import { LearnerSessionsPage } from '@/features/sessions/components/LearnerSessionsPage'

/** `?programme=` (from a path item) narrows the catalogue to that programme's sessions. */
export const Route = createFileRoute('/learner/sessions')({
  validateSearch: programmeSearch,
  component: function LearnerSessionsRoute() {
    const { programme } = Route.useSearch()
    return <LearnerSessionsPage programme={programme} />
  },
})
