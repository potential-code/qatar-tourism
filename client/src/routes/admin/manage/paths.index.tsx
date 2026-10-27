import { PROGRAMME_CODES } from '@shared/constants'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { PathsOverview } from '@/features/academy-mgmt/paths/components/PathsOverview'

const search = z.object({ programme: z.enum(PROGRAMME_CODES).catch('B').default('B') })

export const Route = createFileRoute('/admin/manage/paths/')({
  validateSearch: search,
  component: PathsPage,
})

function PathsPage() {
  const { programme } = Route.useSearch()
  const navigate = Route.useNavigate()
  return (
    <PathsOverview
      programme={programme}
      onProgrammeChange={(next) => navigate({ search: { programme: next }, replace: true })}
    />
  )
}
