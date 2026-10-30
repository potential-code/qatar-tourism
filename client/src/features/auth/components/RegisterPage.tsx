import { FICTIONAL_EMAIL_DOMAIN } from '@shared/schemas/common'
import { Link, useRouter } from '@tanstack/react-router'
import { Mail, Sparkles, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { useAppForm } from '@/hooks/useAppForm'
import { useRefreshSession } from '@/hooks/useSession'
import { ApiError } from '@/lib/api-error'
import { safeRedirect } from '@/lib/safe-redirect'
import { type RegisterResult, useRegister } from '../queries/auth.queries'
import { AuthShell } from './AuthShell'
import { AuthSwitch } from './AuthSwitch'
import { FormAlert } from './FormAlert'
import { PasswordField } from './PasswordField'
import { VerifyPanel } from './VerifyPanel'

/** Messages are `auth` translation keys; the field components translate them when shown. */
const schema = z.object({
  name: z.string().trim().min(2, 'auth:validation.name'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('auth:validation.email')
    .refine(
      (value) => value.endsWith(`@${FICTIONAL_EMAIL_DOMAIN}`),
      'auth:validation.fictionalEmail',
    ),
  password: z.string().min(8, 'auth:validation.min8'),
})

const PROGRAMME_NOTE = { A: 'register.noteA', B: 'register.noteB', C: 'register.noteC' } as const

/**
 * Public registration (brief §3–4): always creates a learner. A short form, then the simulated
 * verification step, then the profile wizard (or the Program A confirmation).
 */
export function RegisterPage({
  programme = 'B',
  redirect,
}: {
  programme?: 'A' | 'B' | 'C'
  redirect?: string
}) {
  const { t } = useTranslation('auth')
  const router = useRouter()
  const refreshSession = useRefreshSession()
  const register = useRegister()
  const [created, setCreated] = useState<{ result: RegisterResult; password: string } | null>(null)
  const [pending, setPending] = useState<{ email: string; password: string } | null>(null)
  const [error, setError] = useState<{ code: string; message: string } | null>(null)

  const form = useAppForm({
    defaultValues: { name: '', email: '', password: '' },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      setError(null)
      try {
        const result = await register.mutateAsync({
          name: value.name.trim(),
          email: value.email.trim(),
          password: value.password,
          programme,
        })
        setCreated({ result, password: value.password })
      } catch (failure) {
        if (failure instanceof ApiError) {
          setError({ code: failure.code, message: failure.message })
          if (failure.code === 'ACCOUNT_UNVERIFIED') {
            setPending({ email: value.email.trim().toLowerCase(), password: value.password })
          }
        } else {
          setError({
            code: 'UNKNOWN',
            message: t('register.failed'),
          })
        }
      }
    },
  })

  async function continueAfterVerification() {
    await refreshSession()
    const back = safeRedirect(redirect, '')
    if (back) router.history.push(back)
    else if (programme === 'A') router.history.push('/programmes/a/enrol')
    else router.history.push('/onboarding')
  }

  const image =
    programme === 'A' ? '/images/official/museum-family.jpg' : '/images/official/city-view.jpg'

  if (created || pending) {
    return (
      <AuthShell image={image} alt="">
        <VerifyPanel
          email={created?.result.email ?? pending?.email ?? ''}
          password={created?.password ?? pending?.password ?? ''}
          initial={created?.result.simulatedEmail ?? null}
          onSignedIn={continueAfterVerification}
        />
      </AuthShell>
    )
  }

  return (
    <AuthShell
      image={image}
      alt={programme === 'A' ? t('register.altA') : t('register.altB')}
      caption={
        <p className="font-display font-light text-3xl leading-snug">{t('register.caption')}</p>
      }
    >
      <AuthSwitch active="register" redirect={redirect} programme={programme} />
      <div className="grid gap-2">
        <h1 className="font-display font-light text-4xl text-ink md:text-[2.75rem]">
          {t('register.title')}
        </h1>
        <p className="text-muted-foreground">{t('register.intro')}</p>
      </div>
      <p className="flex gap-2 rounded-lg bg-teal-mist p-3.5 text-sm text-teal-deep">
        <Sparkles aria-hidden className="mt-0.5 size-4 shrink-0" />
        {t(PROGRAMME_NOTE[programme])}
      </p>
      <form
        noValidate
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void form.handleSubmit()
        }}
      >
        {error ? (
          <FormAlert>
            <span>{error.message}</span>
            {error.code === 'ACCOUNT_EXISTS' ? (
              <span className="flex flex-wrap gap-3">
                <Link
                  to="/login"
                  search={{ redirect }}
                  className="font-medium underline underline-offset-4"
                >
                  {t('register.signInInstead')}
                </Link>
                <Link to="/forgot-password" className="font-medium underline underline-offset-4">
                  {t('register.resetPassword')}
                </Link>
              </span>
            ) : null}
          </FormAlert>
        ) : null}
        <form.AppField name="name" validators={{ onBlur: schema.shape.name }}>
          {(field) => (
            <field.TextField label={t('register.name')} autoComplete="name" icon={UserRound} />
          )}
        </form.AppField>
        <form.AppField name="email" validators={{ onBlur: schema.shape.email }}>
          {(field) => (
            <field.TextField
              label={t('register.email')}
              type="email"
              autoComplete="email"
              icon={Mail}
              description={t('register.emailHint')}
            />
          )}
        </form.AppField>
        <form.AppField name="password" validators={{ onBlur: schema.shape.password }}>
          {() => <PasswordField autoComplete="new-password" hint={t('password.hint')} />}
        </form.AppField>
        <form.AppForm>
          <form.SubmitButton className="h-12 w-full text-base">
            {t('register.submit')}
          </form.SubmitButton>
        </form.AppForm>
        <p className="text-muted-foreground text-xs leading-relaxed">{t('register.next')}</p>
      </form>
    </AuthShell>
  )
}
