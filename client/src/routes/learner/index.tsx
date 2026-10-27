import { createFileRoute } from '@tanstack/react-router'
import { OverviewPage } from '@/features/learner-home/components/OverviewPage'
import { programmeSearch } from '@/features/learning/utils/search'

export const Route = createFileRoute('/learner/')({
  validateSearch: programmeSearch,
  component: OverviewPage,
})
