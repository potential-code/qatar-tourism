import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { AuthLayout } from '@/components/AuthLayout'
import { useAppForm } from '@/hooks/useAppForm'
import { authClient } from '@/lib/auth-client'
import { redirectIfSignedIn } from '@/lib/route-guards'

const registerSchema = z.object({
  name: z.string().trim().min(1, 'validation.required'),
  email: z.email('validation.emailInvalid'),
  password: z.string().min(8, 'validation.passwordMin'),
})

export const Route = createFileRoute('/(auth)/register')({
  beforeLoad: redirectIfSignedIn,
  component: RegisterPage,
})

function RegisterPage() {
  const { t } = useTranslation()
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useAppForm({
    defaultValues: { name: '', email: '', password: '' },
    validators: { onSubmit: registerSchema },
    onSubmit: async ({ value }) => {
      setFormError(null)
      const { error } = await authClient.signUp.email({
        name: value.name.trim(),
        email: value.email,
        password: value.password,
        // Where the verification link lands. Must be an origin in the server's CLIENT_URL.
        callbackURL: `${window.location.origin}/login?verified=true`,
      })
      if (error) {
        setFormError(t('auth.register.failed'))
        return
      }
      setSentTo(value.email)
    },
  })

  const footer = (
    <span>
      {t('auth.register.haveAccount')}{' '}
      <Link to="/login" className="font-medium text-foreground underline">
        {t('auth.register.login')}
      </Link>
    </span>
  )

  if (sentTo) {
    return (
      <AuthLayout title={t('auth.register.checkEmailTitle')} footer={footer}>
        <p role="status" className="text-sm">
          {t('auth.register.checkEmailBody', { email: sentTo })}
        </p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title={t('auth.register.title')}
      description={t('auth.register.description')}
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
        {formError ? (
          <p role="alert" className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
            {formError}
          </p>
        ) : null}
        <form.AppField name="name">
          {(field) => <field.TextField label={t('fields.name')} autoComplete="name" />}
        </form.AppField>
        <form.AppField name="email">
          {(field) => (
            <field.TextField label={t('fields.email')} type="email" autoComplete="email" />
          )}
        </form.AppField>
        <form.AppField name="password">
          {(field) => (
            <field.TextField
              label={t('fields.password')}
              type="password"
              autoComplete="new-password"
            />
          )}
        </form.AppField>
        <form.AppForm>
          <form.SubmitButton className="w-full">{t('auth.register.submit')}</form.SubmitButton>
        </form.AppForm>
      </form>
    </AuthLayout>
  )
}
