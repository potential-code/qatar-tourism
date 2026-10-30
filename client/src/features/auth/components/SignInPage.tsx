import { Link } from '@tanstack/react-router'
import { GraduationCap, Info, Mail } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control'
import { useAppForm } from '@/hooks/useAppForm'
import { ApiError } from '@/lib/api-error'
import { useAfterSignIn } from '../hooks/useAfterSignIn'
import { useSignIn } from '../queries/session.queries'
import { MODE_IMAGE, SIGN_IN_MODES, type SignInMode } from '../utils/modes'
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

/** Sign in (brief §3): Learner / Trainer / Academy admin modes; the account decides access. */
export function SignInPage({
  initialMode = 'learner',
  redirect,
  verified,
}: {
  initialMode?: SignInMode
  redirect?: string
  verified?: boolean
}) {
  const reduce = useReducedMotion()
  const { t } = useTranslation('auth')
  const [mode, setMode] = useState<SignInMode>(initialMode)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unverified, setUnverified] = useState<{ email: string; password: string } | null>(null)
  const afterSignIn = useAfterSignIn()
  const signIn = useSignIn()
  const image = MODE_IMAGE[mode]
  const alt = t(`modes.${mode}.alt`)

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
        setError(apiError?.code === 'ACCOUNT_SUSPENDED' ? apiError.message : t('signIn.invalid'))
        return
      }
      await afterSignIn({ mode, redirect })
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
          onSignedIn={() => afterSignIn({ mode, redirect })}
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
      <div className="grid gap-5">
        <SegmentedControl
          aria-label={t('signIn.modeAria')}
          value={mode}
          onValueChange={(value) => setMode(value as SignInMode)}
          className="h-12 w-full rounded-xl bg-sand-deep p-1.5 shadow-[var(--qt-shadow-inset)]"
        >
          {SIGN_IN_MODES.map((m) => (
            <SegmentedControlItem
              key={m}
              value={m}
              className="relative isolate h-full flex-1 rounded-lg text-ink/75 transition-colors duration-300 hover:text-teal data-[state=checked]:bg-transparent data-[state=checked]:text-teal data-[state=checked]:shadow-none"
            >
              {mode === m ? (
                <motion.span
                  layoutId="sign-in-mode-pill"
                  aria-hidden
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  className="absolute inset-0 -z-10 rounded-lg bg-white shadow-md ring-1 ring-teal/10"
                />
              ) : null}
              {t(`modes.${m}.tab`)}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="grid gap-2"
          >
            <h1 className="font-display font-light text-4xl text-ink md:text-[2.75rem]">
              {t(`modes.${mode}.title`)}
            </h1>
            <p className="text-muted-foreground">{t(`modes.${mode}.description`)}</p>
            {mode === 'trainer' || mode === 'admin' ? (
              <p className="flex gap-2 rounded-lg bg-teal-mist p-3 text-sm text-teal-deep">
                <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
                {t(`modes.${mode}.note`)}
              </p>
            ) : null}
          </motion.div>
        </AnimatePresence>
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

      {mode === 'learner' ? (
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={() => setMode('trainer')}
        >
          <GraduationCap aria-hidden />
          {t('signIn.asTrainer')}
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setMode('learner')}
        >
          {t('signIn.backToLearner')}
        </Button>
      )}

      <SsoButtons redirect={redirect} />
    </AuthShell>
  )
}
