import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ResetPasswordPage } from '@/features/auth/components/ResetPasswordPage'

// The demo reset link (shown in the demo inbox) opens this page with `?token=…`.
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
