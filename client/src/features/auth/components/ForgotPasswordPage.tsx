import { Link } from '@tanstack/react-router'
import { Mail } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { SimulatedTag } from '@/components/layout'
import { useAppForm } from '@/hooks/useAppForm'
import { type ResetEmail, useRequestPasswordReset } from '../queries/auth.queries'
import { AuthShell } from './AuthShell'
import { FormAlert } from './FormAlert'

const schema = z.object({ email: z.email('auth:validation.email') })

/** Forgot password. The answer is the same whether or not the account exists. */
export function ForgotPasswordPage() {
  const { t } = useTranslation('auth')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [demoEmail, setDemoEmail] = useState<ResetEmail | null>(null)
  const [error, setError] = useState(false)
  const request = useRequestPasswordReset()
  const form = useAppForm({
    defaultValues: { email: '' },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      setError(false)
      const result = await request.mutateAsync(value.email.trim()).catch(() => null)
      if (!result) {
        setError(true)
        return
      }
      setDemoEmail(result.simulatedEmail)
      setSentTo(value.email.trim())
    },
  })

  return (
    <AuthShell image="/images/official/zulal-spa.jpg" alt={t('forgot.alt')}>
      <div className="grid gap-2">
        <h1 className="font-display font-light text-4xl rtl:leading-[1.4]">{t('forgot.title')}</h1>
        <p className="text-muted-foreground">{t('forgot.intro')}</p>
      </div>
      {sentTo ? (
        <div className="grid gap-4">
          <FormAlert tone="success">{t('forgot.sent', { email: sentTo })}</FormAlert>
          <p className="flex flex-wrap items-center gap-2 text-muted-foreground text-sm">
            <SimulatedTag label={t('inbox.demoEmail')} />
            {t('forgot.demoNote')}
            {demoEmail ? t('forgot.demoShown') : null}
          </p>
          {demoEmail ? <ResetInbox email={demoEmail} /> : null}
        </div>
      ) : (
        <form
          noValidate
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            void form.handleSubmit()
          }}
        >
          {error ? <FormAlert>{t('forgot.error')}</FormAlert> : null}
          <form.AppField name="email" validators={{ onBlur: schema.shape.email }}>
            {(field) => (
              <field.TextField
                label={t('signIn.email')}
                type="email"
                autoComplete="email"
                icon={Mail}
              />
            )}
          </form.AppField>
          <form.AppForm>
            <form.SubmitButton className="h-12 w-full text-base">
              {t('forgot.submit')}
            </form.SubmitButton>
          </form.AppForm>
        </form>
      )}
      <Link to="/login" className="w-fit text-teal text-sm underline-offset-4 hover:underline">
        {t('forgot.back')}
      </Link>
    </AuthShell>
  )
}

/** The demo inbox for a reset link: shown on screen instead of sending an email. */
function ResetInbox({ email }: { email: ResetEmail }) {
  const { t } = useTranslation('auth')
  return (
    <figure
      aria-label={t('inbox.demoEmail')}
      className="grid gap-3 rounded-xl bg-white p-5 ring-1 ring-ink/5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 font-medium text-sm">
          <Mail aria-hidden className="size-4 text-teal" />
          {t('inbox.title')}
        </span>
        <SimulatedTag label={t('inbox.demoEmail')} />
      </div>
      <div className="grid gap-1 border-ink/5 border-t pt-3 text-sm">
        <p className="text-muted-foreground text-xs">{t('inbox.to', { email: email.to })}</p>
        <p className="font-medium">{email.subject}</p>
        <p className="text-muted-foreground leading-relaxed">{email.body}</p>
      </div>
      <Link
        to="/reset-password"
        search={{ token: email.token }}
        className="w-fit font-medium text-teal-deep underline underline-offset-4"
      >
        {t('forgot.openLink')}
      </Link>
      <figcaption className="text-muted-foreground text-xs">{email.label}.</figcaption>
    </figure>
  )
}
