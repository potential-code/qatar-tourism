import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { useAppForm } from '@/hooks/useAppForm'
import { useResetPassword } from '../queries/auth.queries'
import { AuthShell } from './AuthShell'
import { FormAlert } from './FormAlert'
import { PasswordField } from './PasswordField'

const passwordRule = z.string().min(8, 'Use at least 8 characters')

const schema = z
  .object({
    password: passwordRule,
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'The passwords do not match',
    path: ['confirmPassword'],
  })

/** The demo reset link opens this page with `?token=…` (or `?error=INVALID_TOKEN`). */
export function ResetPasswordPage({ token, error }: { token?: string; error?: string }) {
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
      toast.success('Your password has been changed. Sign in with the new password.')
      await navigate({ to: '/login' })
    },
  })
  const invalid = !token || error || failed
  return (
    <AuthShell image="/images/official/zulal-spa.jpg" alt="A calm spa interior">
      <h1 className="font-display font-light text-4xl">Choose a new password</h1>
      {invalid ? (
        <FormAlert>
          This reset link is not valid or has expired.{' '}
          <Link to="/forgot-password" className="font-medium underline underline-offset-4">
            Request a new link
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
                label="New password"
                autoComplete="new-password"
                hint="At least 8 characters."
              />
            )}
          </form.AppField>
          <form.AppField name="confirmPassword">
            {() => <PasswordField label="Confirm new password" autoComplete="new-password" />}
          </form.AppField>
          <form.AppForm>
            <form.SubmitButton className="h-11 w-full">Save new password</form.SubmitButton>
          </form.AppForm>
        </form>
      ) : null}
    </AuthShell>
  )
}
