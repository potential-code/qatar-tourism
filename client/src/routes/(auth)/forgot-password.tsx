import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { AuthLayout } from '@/components/AuthLayout'
import { useAppForm } from '@/hooks/useAppForm'
import { authClient } from '@/lib/auth-client'
import { redirectIfSignedIn } from '@/lib/route-guards'

const forgotSchema = z.object({
  email: z.email('validation.emailInvalid'),
})

export const Route = createFileRoute('/(auth)/forgot-password')({
  beforeLoad: redirectIfSignedIn,
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [sentTo, setSentTo] = useState<string | null>(null)

  const form = useAppForm({
    defaultValues: { email: '' },
    validators: { onSubmit: forgotSchema },
    onSubmit: async ({ value }) => {
      const { error } = await authClient.requestPasswordReset({
        email: value.email,
        redirectTo: `${window.location.origin}/reset-password`,
      })
      // The server answers the same whether or not the account exists; only transport or
      // rate-limit failures come back as errors.
      if (error) {
        toast.error(t('errors.generic'))
        return
      }
      setSentTo(value.email)
    },
  })

  const footer = (
    <Link to="/login" className="font-medium text-foreground underline">
      {t('auth.forgot.backToLogin')}
    </Link>
  )

  if (sentTo) {
    return (
      <AuthLayout title={t('auth.forgot.sentTitle')} footer={footer}>
        <p role="status" className="text-sm">
          {t('auth.forgot.sentBody', { email: sentTo })}
        </p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title={t('auth.forgot.title')}
      description={t('auth.forgot.description')}
      footer={footer}
    >
      <form
        noValidate
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void form.handleSubmit()
        }}
      >
        <form.AppField name="email">
          {(field) => (
            <field.TextField label={t('fields.email')} type="email" autoComplete="email" />
          )}
        </form.AppField>
        <form.AppForm>
          <form.SubmitButton className="w-full">{t('auth.forgot.submit')}</form.SubmitButton>
        </form.AppForm>
      </form>
    </AuthLayout>
  )
}
