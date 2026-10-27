import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ResetPasswordPage } from '@/features/auth/components/ResetPasswordPage'

// Better Auth redirects here with `?token=…`, or `?error=INVALID_TOKEN` for a bad link.
const searchSchema = z.object({
  token: z.string().optional(),
  error: z.string().optional(),
})

export const Route = createFileRoute('/(auth)/reset-password')({
  validateSearch: searchSchema,
  component: function ResetRoute() {
    const { token, error } = Route.useSearch()
    return <ResetPasswordPage token={token} error={error} />
  },
})
