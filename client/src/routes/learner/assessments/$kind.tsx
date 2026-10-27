import { createFileRoute, notFound } from '@tanstack/react-router'
import { AssessmentPage } from '@/features/assessments/components/AssessmentPage'
import { programmeSearch } from '@/features/learning/utils/search'

const KINDS = ['pre', 'post', 'formative'] as const

export const Route = createFileRoute('/learner/assessments/$kind')({
  validateSearch: programmeSearch,
  beforeLoad: ({ params }) => {
    if (!KINDS.includes(params.kind as (typeof KINDS)[number])) throw notFound()
  },
  component: function AssessmentRoute() {
    const { kind } = Route.useParams()
    return <AssessmentPage key={kind} kind={kind as (typeof KINDS)[number]} />
  },
})
