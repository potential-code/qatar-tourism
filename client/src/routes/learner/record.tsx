import { createFileRoute } from '@tanstack/react-router'
import { LearnerRecordPage } from '@/features/learner-record/components/LearnerRecordPage'

export const Route = createFileRoute('/learner/record')({
  component: LearnerRecordPage,
})
