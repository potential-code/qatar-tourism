import { ROLEPLAY_SCENARIOS } from '@shared/content/scenarios'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { PracticeOverview } from '@/features/roleplay/components/PracticeOverview'

/**
 * `?scenario=` comes from a path item (My learning): open that scenario directly. `?programme=`
 * is accepted so the learner's programme context survives the link.
 */
const search = z.object({
  programme: z.enum(['A', 'B', 'C']).optional().catch(undefined),
  scenario: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/learner/practice/')({
  validateSearch: search,
  beforeLoad: ({ search: { scenario } }) => {
    if (scenario && ROLEPLAY_SCENARIOS.some((s) => s.key === scenario)) {
      throw redirect({ to: '/learner/practice/$scenarioKey', params: { scenarioKey: scenario } })
    }
  },
  component: PracticeOverview,
})
