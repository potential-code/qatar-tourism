import { createFileRoute } from '@tanstack/react-router'
import { AiPathPage } from '@/features/ai-path/components/AiPathPage'
import { programmeSearch } from '@/features/learning/utils/search'

export const Route = createFileRoute('/learner/learning/path')({
  validateSearch: programmeSearch,
  component: AiPathPage,
})
