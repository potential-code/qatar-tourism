import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { useAppForm } from '@/hooks/useAppForm'
import { useResetPassword } from '../queries/auth.queries'
import { AuthShell } from './AuthShell'
import { FormAlert } from './FormAlert'
import { PasswordField } from './PasswordField'

const passwordRule = z.string().min(8, 'auth:validation.min8')

const schema = z
  .object({
    password: passwordRule,
    confirmPassword: z.string().min(1, 'auth:validation.confirm'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'auth:validation.mismatch',
    path: ['confirmPassword'],
  })

/** The demo reset link opens this page with `?token=…` (or `?error=INVALID_TOKEN`). */
export function ResetPasswordPage({ token, error }: { token?: string; error?: string }) {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const [failed, setFailed] = useState(false)
  const reset = useResetPassword()
  const form = useAppForm({
    defaultValues: { password: '', confirmPassword: '' },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      if (!token) return
      const ok = await reset
        .mutateAsync({ newPassword: value.password, token })
        .then(() => true)
        .catch(() => false)
      if (!ok) {
        setFailed(true)
        return
      }
      toast.success(t('reset.success'))
      await navigate({ to: '/login' })
    },
  })
  const invalid = !token || error || failed
  return (
    <AuthShell image="/images/official/zulal-spa.jpg" alt={t('forgot.alt')}>
      <h1 className="font-display font-light text-4xl rtl:leading-[1.4]">{t('reset.title')}</h1>
      {invalid ? (
        <FormAlert>
          {t('reset.invalid')}{' '}
          <Link to="/forgot-password" className="font-medium underline underline-offset-4">
            {t('reset.requestNew')}
          </Link>
        </FormAlert>
      ) : null}
      {token && !error ? (
        <form
          noValidate
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            void form.handleSubmit()
          }}
        >
          <form.AppField name="password" validators={{ onBlur: passwordRule }}>
            {() => (
              <PasswordField
                label={t('reset.newPassword')}
                autoComplete="new-password"
                hint={t('password.hint')}
              />
            )}
          </form.AppField>
          <form.AppField name="confirmPassword">
            {() => <PasswordField label={t('reset.confirmPassword')} autoComplete="new-password" />}
          </form.AppField>
          <form.AppForm>
            <form.SubmitButton className="h-12 w-full text-base">
              {t('reset.save')}
            </form.SubmitButton>
          </form.AppForm>
        </form>
      ) : null}
    </AuthShell>
  )
}
