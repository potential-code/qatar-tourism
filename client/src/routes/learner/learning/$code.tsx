import { createFileRoute, notFound } from '@tanstack/react-router'
import { UnitPage } from '@/features/learning/components/UnitPage'
import { programmeSearch } from '@/features/learning/utils/search'

export const Route = createFileRoute('/learner/learning/$code')({
  validateSearch: programmeSearch,
  beforeLoad: ({ params }) => {
    if (!/^C0[1-9]$/.test(params.code)) throw notFound()
  },
  component: function UnitRoute() {
    const { code } = Route.useParams()
    return <UnitPage code={code} />
  },
})
