import { createFileRoute } from '@tanstack/react-router'
import { LearnerRecordPage } from '@/features/learner-record/components/LearnerRecordPage'
import { programmeSearch } from '@/features/learning/utils/search'

export const Route = createFileRoute('/learner/record')({
  validateSearch: programmeSearch,
  component: LearnerRecordPage,
})
