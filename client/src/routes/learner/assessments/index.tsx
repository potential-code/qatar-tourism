import { createFileRoute } from '@tanstack/react-router'
import { AssessmentsPage } from '@/features/assessments/components/AssessmentsPage'
import { programmeSearch } from '@/features/learning/utils/search'

export const Route = createFileRoute('/learner/assessments/')({
  validateSearch: programmeSearch,
  component: AssessmentsPage,
})
