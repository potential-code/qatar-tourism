import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { RegisterPage } from '@/features/auth/components/RegisterPage'
import { redirectIfSignedIn } from '@/lib/route-guards'

const searchSchema = z.object({
  /** Programme the visitor was viewing; Program B by default (brief §3). */
  programme: z.enum(['A', 'B', 'C']).optional().catch(undefined),
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/(auth)/register')({
  validateSearch: searchSchema,
  beforeLoad: redirectIfSignedIn,
  component: function RegisterRoute() {
    const search = Route.useSearch()
    return <RegisterPage programme={search.programme} redirect={search.redirect} />
  },
})
