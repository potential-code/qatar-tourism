import { DEMO_PASSWORD } from '@shared/constants'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ChevronRight, GraduationCap, Loader2, Mail, Shield, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useAppForm } from '@/hooks/useAppForm'
import { ApiError } from '@/lib/api-error'
import { useAfterSignIn } from '../hooks/useAfterSignIn'
import { useSignIn } from '../queries/session.queries'
import { MODE_IMAGE, type SignInMode } from '../utils/modes'
import { AuthShell } from './AuthShell'
import { AuthSwitch } from './AuthSwitch'
import { FormAlert } from './FormAlert'
import { PasswordField } from './PasswordField'
import { SsoButtons } from './SsoButtons'
import { VerifyPanel } from './VerifyPanel'

/** Messages are `auth` translation keys; the field components translate them when shown. */
const schema = z.object({
  email: z.email('auth:validation.email'),
  password: z.string().min(1, 'auth:validation.password'),
})

/** The seeded demo accounts offered under the form; one click opens that portal. */
const DEMO_ACCOUNTS: { role: SignInMode; email: string; icon: typeof UserRound }[] = [
  { role: 'learner', email: 'learner0001@example.com', icon: UserRound },
  { role: 'trainer', email: 'trainer01@example.com', icon: GraduationCap },
  { role: 'admin', email: 'admin@example.com', icon: Shield },
]

/**
 * Sign in: one email and password form for every account (the account's real role decides
 * where it goes), plus one-click demo accounts that open each portal directly.
 */
export function SignInPage({
  redirect,
  verified,
}: {
  initialMode?: SignInMode
  redirect?: string
  verified?: boolean
}) {
  const { t } = useTranslation('auth')
  const [pendingDemo, setPendingDemo] = useState<SignInMode | null>(null)
  const queryClient = useQueryClient()
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unverified, setUnverified] = useState<{ email: string; password: string } | null>(null)
  const afterSignIn = useAfterSignIn()
  const signIn = useSignIn()
  const image = MODE_IMAGE.learner
  const alt = t('modes.learner.alt')

  async function openDemo(account: (typeof DEMO_ACCOUNTS)[number]) {
    setError(null)
    setPendingDemo(account.role)
    try {
      await signIn.mutateAsync({ email: account.email, password: DEMO_PASSWORD })
      // The next user must not see the previous user's cached data.
      queryClient.clear()
      await afterSignIn({ redirect })
    } catch {
      setError(t('demo.failed'))
      setPendingDemo(null)
    }
  }

  const form = useAppForm({
    defaultValues: { email: '', password: '' },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      setError(null)
      try {
        await signIn.mutateAsync({ email: value.email.trim(), password: value.password })
      } catch (failure) {
        const apiError = failure instanceof ApiError ? failure : null
        if (apiError?.code === 'EMAIL_NOT_VERIFIED') {
          setUnverified({ email: value.email.trim().toLowerCase(), password: value.password })
          return
        }
        setError(
          apiError?.code === 'ACCOUNT_LOCKED'
            ? t('locked')
            : apiError?.code === 'ACCOUNT_SUSPENDED'
              ? apiError.message
              : t('signIn.invalid'),
        )
        return
      }
      await afterSignIn({ redirect })
    },
  })

  if (unverified) {
    return (
      <AuthShell image={image} alt={alt}>
        <VerifyPanel
          email={unverified.email}
          password={unverified.password}
          initial={null}
          rememberMe={remember}
          onSignedIn={() => afterSignIn({ redirect })}
        />
      </AuthShell>
    )
  }

  return (
    <AuthShell
      image={image}
      alt={alt}
      caption={
        <p className="font-display font-light text-3xl leading-snug">{t('signIn.caption')}</p>
      }
    >
      <AuthSwitch active="login" redirect={redirect} />
      <div className="grid gap-2">
        <h1 className="font-display font-light text-4xl text-ink md:text-[2.75rem]">
          {t('modes.learner.title')}
        </h1>
        <p className="text-muted-foreground">{t('signIn.description')}</p>
      </div>

      <form
        noValidate
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void form.handleSubmit()
        }}
      >
        {verified ? <FormAlert tone="success">{t('signIn.verified')}</FormAlert> : null}
        {error ? <FormAlert>{error}</FormAlert> : null}
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
        <form.AppField name="password" validators={{ onBlur: schema.shape.password }}>
          {() => <PasswordField autoComplete="current-password" />}
        </form.AppField>
        <div className="flex items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Checkbox
              id="remember"
              checked={remember}
              onCheckedChange={(v) => setRemember(v === true)}
            />
            <Label htmlFor="remember" className="font-normal">
              {t('signIn.remember')}
            </Label>
          </div>
          <Link
            to="/forgot-password"
            className="font-medium text-teal underline-offset-4 hover:underline"
          >
            {t('signIn.forgot')}
          </Link>
        </div>
        <form.AppForm>
          <form.SubmitButton className="h-12 w-full text-base">
            {t('signIn.submit')}
          </form.SubmitButton>
        </form.AppForm>
      </form>

      <section aria-labelledby="demo-title" className="grid gap-3">
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-ink/10" />
          <h2 id="demo-title" className="text-muted-foreground text-xs">
            {t('demo.title')}
          </h2>
          <span className="h-px flex-1 bg-ink/10" />
        </div>
        <ul className="grid gap-2">
          {DEMO_ACCOUNTS.map((account) => {
            const Icon = account.icon
            return (
              <li key={account.role}>
                <button
                  type="button"
                  disabled={pendingDemo !== null}
                  onClick={() => void openDemo(account)}
                  className="group flex w-full items-center gap-3 rounded-xl border border-teal/15 bg-white px-4 py-3 text-start transition-colors hover:border-teal/40 hover:bg-teal-mist focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-teal-mist text-teal">
                    <Icon aria-hidden className="size-4" />
                  </span>
                  <span className="grid min-w-0 flex-1">
                    <span className="font-medium text-ink text-sm">
                      {t(`demo.${account.role}.title`)}
                    </span>
                    <span className="truncate text-muted-foreground text-xs" dir="ltr">
                      {account.email}
                    </span>
                  </span>
                  {pendingDemo === account.role ? (
                    <Loader2 aria-hidden className="size-4 shrink-0 animate-spin text-teal" />
                  ) : (
                    <ChevronRight
                      aria-hidden
                      className="size-4 shrink-0 text-teal transition-transform group-hover:translate-x-0.5 rtl:rotate-180"
                    />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <SsoButtons redirect={redirect} />
    </AuthShell>
  )
}
