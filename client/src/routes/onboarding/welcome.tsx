import { createFileRoute } from '@tanstack/react-router'
import { ProgramBWelcome } from '@/features/profile/components/ProgramBWelcome'
import { requireRole } from '@/lib/route-guards'

/** Program B welcome (brief §3 routing: profile → Program B welcome → pre-assessment). */
export const Route = createFileRoute('/onboarding/welcome')({
  beforeLoad: requireRole('learner'),
  component: ProgramBWelcome,
})
