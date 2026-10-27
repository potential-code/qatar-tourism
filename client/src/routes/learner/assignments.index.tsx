import { createFileRoute } from '@tanstack/react-router'
import { AssignmentsPage } from '@/features/assignments/components/AssignmentsPage'
import { programmeSearch } from '@/features/learning/utils/search'

/** `?programme=` (from a path item) narrows the list to that programme's assignments. */
export const Route = createFileRoute('/learner/assignments/')({
  validateSearch: programmeSearch,
  component: function AssignmentsRoute() {
    const { programme } = Route.useSearch()
    return <AssignmentsPage programme={programme} />
  },
})
