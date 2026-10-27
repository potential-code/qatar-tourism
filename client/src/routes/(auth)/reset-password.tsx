import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { AuthLayout } from '@/components/AuthLayout'
import { useAppForm } from '@/hooks/useAppForm'
import { authClient } from '@/lib/auth-client'

// Better Auth redirects here with `?token=…`, or `?error=INVALID_TOKEN` for a bad link.
const searchSchema = z.object({
  token: z.string().optional(),
  error: z.string().optional(),
})

const resetSchema = z
  .object({
    password: z.string().min(8, 'validation.passwordMin'),
    confirmPassword: z.string().min(1, 'validation.required'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'validation.passwordsMismatch',
    path: ['confirmPassword'],
  })

export const Route = createFileRoute('/(auth)/reset-password')({
  validateSearch: searchSchema,
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { t } = useTranslation()
  const { token, error } = Route.useSearch()
  const navigate = useNavigate()

  const form = useAppForm({
    defaultValues: { password: '', confirmPassword: '' },
    validators: { onSubmit: resetSchema },
    onSubmit: async ({ value }) => {
      if (!token) return
      const result = await authClient.resetPassword({ newPassword: value.password, token })
      if (result.error) {
        toast.error(t('auth.reset.invalidToken'))
        return
      }
      toast.success(t('auth.reset.success'))
      await navigate({ to: '/login' })
    },
  })

  const footer = (
    <Link to="/forgot-password" className="font-medium text-foreground underline">
      {t('auth.reset.requestNew')}
    </Link>
  )

  if (!token || error) {
    return (
      <AuthLayout title={t('auth.reset.title')} footer={footer}>
        <p role="alert" className="text-destructive text-sm">
          {t('auth.reset.invalidToken')}
        </p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title={t('auth.reset.title')} description={t('auth.reset.description')}>
      <form
        noValidate
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void form.handleSubmit()
        }}
      >
        <form.AppField name="password">
          {(field) => (
            <field.TextField
              label={t('fields.newPassword')}
              type="password"
              autoComplete="new-password"
            />
          )}
        </form.AppField>
        <form.AppField name="confirmPassword">
          {(field) => (
            <field.TextField
              label={t('fields.confirmPassword')}
              type="password"
              autoComplete="new-password"
            />
          )}
        </form.AppField>
        <form.AppForm>
          <form.SubmitButton className="w-full">{t('auth.reset.submit')}</form.SubmitButton>
        </form.AppForm>
      </form>
    </AuthLayout>
  )
}
