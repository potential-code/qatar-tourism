import { createFileRoute } from '@tanstack/react-router'
import { LearningPage } from '@/features/learning/components/LearningPage'
import { programmeSearch } from '@/features/learning/utils/search'

export const Route = createFileRoute('/learner/learning/')({
  validateSearch: programmeSearch,
  component: LearningPage,
})
