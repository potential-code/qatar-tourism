import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { AuthLayout } from '@/components/AuthLayout'
import { useAppForm } from '@/hooks/useAppForm'
import { useRefreshSession } from '@/hooks/useSession'
import { authClient } from '@/lib/auth-client'
import { redirectIfSignedIn } from '@/lib/route-guards'
import { safeRedirect } from '@/lib/safe-redirect'

const searchSchema = z.object({
  redirect: z.string().optional(),
  // Better Auth sends the user back here after the verification link is opened.
  verified: z.boolean().optional(),
})

const loginSchema = z.object({
  email: z.email('validation.emailInvalid'),
  password: z.string().min(1, 'validation.required'),
})

export const Route = createFileRoute('/(auth)/login')({
  validateSearch: searchSchema,
  beforeLoad: redirectIfSignedIn,
  component: LoginPage,
})

function LoginPage() {
  const { t } = useTranslation()
  const search = Route.useSearch()
  const router = useRouter()
  const refreshSession = useRefreshSession()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useAppForm({
    defaultValues: { email: '', password: '' },
    validators: { onSubmit: loginSchema },
    onSubmit: async ({ value }) => {
      setFormError(null)
      const { error } = await authClient.signIn.email({
        email: value.email,
        password: value.password,
        callbackURL: `${window.location.origin}/login?verified=true`,
      })
      if (error) {
        // 403 = email not verified; Better Auth re-sends the link on this attempt.
        setFormError(error.status === 403 ? t('auth.login.unverified') : t('auth.login.failed'))
        return
      }
      await refreshSession()
      router.history.push(safeRedirect(search.redirect))
    },
  })

  return (
    <AuthLayout
      title={t('auth.login.title')}
      description={t('auth.login.description')}
      footer={
        <span>
          {t('auth.login.noAccount')}{' '}
          <Link to="/register" className="font-medium text-foreground underline">
            {t('auth.login.register')}
          </Link>
        </span>
      }
    >
      <form
        noValidate
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void form.handleSubmit()
        }}
      >
        {search.verified ? (
          <p role="status" className="rounded-md bg-muted p-3 text-sm">
            {t('auth.login.verified')}
          </p>
        ) : null}
        {formError ? (
          <p role="alert" className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
            {formError}
          </p>
        ) : null}
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
              autoComplete="current-password"
            />
          )}
        </form.AppField>
        <div className="-mt-2 text-end text-sm">
          <Link to="/forgot-password" className="text-muted-foreground underline">
            {t('auth.login.forgot')}
          </Link>
        </div>
        <form.AppForm>
          <form.SubmitButton className="w-full">{t('auth.login.submit')}</form.SubmitButton>
        </form.AppForm>
      </form>
    </AuthLayout>
  )
}
