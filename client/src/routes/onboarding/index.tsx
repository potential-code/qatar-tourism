import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ProfileWizard } from '@/features/profile/wizard/ProfileWizard'
import { requireRole } from '@/lib/route-guards'

/** Profile wizard (brief §4). Learners only; the API scopes every call to the caller. */
export const Route = createFileRoute('/onboarding/')({
  validateSearch: z.object({ programme: z.enum(['A', 'B']).optional().catch(undefined) }),
  beforeLoad: requireRole('learner'),
  component: ProfileWizard,
})
