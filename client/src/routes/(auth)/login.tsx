import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { SignInPage } from '@/features/auth/components/SignInPage'
import { SIGN_IN_MODES } from '@/features/auth/utils/modes'
import { redirectIfSignedIn } from '@/lib/route-guards'

const searchSchema = z.object({
  redirect: z.string().optional(),
  /** Interface mode only; never a role (brief §3). */
  mode: z.enum(SIGN_IN_MODES).optional().catch(undefined),
  verified: z.boolean().optional(),
})

export const Route = createFileRoute('/(auth)/login')({
  validateSearch: searchSchema,
  beforeLoad: redirectIfSignedIn,
  component: function LoginRoute() {
    const search = Route.useSearch()
    return (
      <SignInPage
        key={search.mode ?? 'learner'}
        initialMode={search.mode}
        redirect={search.redirect}
        verified={search.verified}
      />
    )
  },
})
