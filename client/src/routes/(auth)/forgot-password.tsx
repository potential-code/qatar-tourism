import { createFileRoute } from '@tanstack/react-router'
import { ForgotPasswordPage } from '@/features/auth/components/ForgotPasswordPage'
import { redirectIfSignedIn } from '@/lib/route-guards'

export const Route = createFileRoute('/(auth)/forgot-password')({
  beforeLoad: redirectIfSignedIn,
  component: ForgotPasswordPage,
})
