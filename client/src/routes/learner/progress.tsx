import { createFileRoute } from '@tanstack/react-router'
import { programmeSearch } from '@/features/learning/utils/search'
import { ProgressPage } from '@/features/progress/components/ProgressPage'

export const Route = createFileRoute('/learner/progress')({
  validateSearch: programmeSearch,
  component: ProgressPage,
})
