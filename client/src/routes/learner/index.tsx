import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { OverviewPage } from '@/features/learner-home/components/OverviewPage'
import { programmeSearch } from '@/features/learning/utils/search'

/** `?profile=later`: the learner chose "Save and finish later", so stay on the Overview. */
const search = programmeSearch.extend({
  profile: z.literal('later').optional().catch(undefined),
})

export const Route = createFileRoute('/learner/')({
  validateSearch: search,
  component: function OverviewRoute() {
    const { profile } = Route.useSearch()
    return <OverviewPage profileDeferred={profile === 'later'} />
  },
})
