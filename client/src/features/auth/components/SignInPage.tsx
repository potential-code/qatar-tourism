import { Link } from '@tanstack/react-router'
import { GraduationCap, Info, Mail } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control'
import { useAppForm } from '@/hooks/useAppForm'
import { authClient } from '@/lib/auth-client'
import { useAfterSignIn } from '../hooks/useAfterSignIn'
import { MODE_COPY, SIGN_IN_MODES, type SignInMode } from '../utils/modes'
import { AuthShell } from './AuthShell'
import { AuthSwitch } from './AuthSwitch'
import { FormAlert } from './FormAlert'
import { PasswordField } from './PasswordField'
import { SsoButtons } from './SsoButtons'
import { VerifyPanel } from './VerifyPanel'

const schema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
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
  const [mode, setMode] = useState<SignInMode>(initialMode)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unverified, setUnverified] = useState<{ email: string; password: string } | null>(null)
  const afterSignIn = useAfterSignIn()
  const copy = MODE_COPY[mode]

  const form = useAppForm({
    defaultValues: { email: '', password: '' },
    validators: { onSubmit: schema },
    onSubmit: async ({ value }) => {
      setError(null)
      const { error: failure } = await authClient.signIn.email({
        email: value.email.trim(),
        password: value.password,
        rememberMe: remember,
      })
      if (failure) {
        if (failure.status === 403) {
          setUnverified({ email: value.email.trim().toLowerCase(), password: value.password })
          return
        }
        setError(
          failure.status === 429
            ? 'Too many attempts. Wait a few minutes and try again.'
            : 'Email or password is incorrect. Check them and try again, or reset your password.',
        )
        return
      }
      await afterSignIn({ mode, redirect })
    },
  })

  if (unverified) {
    return (
      <AuthShell image={copy.image} alt={copy.alt}>
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
      image={copy.image}
      alt={copy.alt}
      caption={
        <p className="font-display font-light text-3xl leading-snug">
          Build the skills to create memorable visitor experiences.
        </p>
      }
    >
      <AuthSwitch active="login" redirect={redirect} />
      <div className="grid gap-5">
        <SegmentedControl
          aria-label="Sign-in mode"
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
              {MODE_COPY[m].tab}
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
              {copy.title}
            </h1>
            <p className="text-muted-foreground">{copy.description}</p>
            {copy.note ? (
              <p className="flex gap-2 rounded-lg bg-teal-mist p-3 text-sm text-teal-deep">
                <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
                {copy.note}
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
        {verified ? (
          <FormAlert tone="success">Your email is verified. Sign in to continue.</FormAlert>
        ) : null}
        {error ? <FormAlert>{error}</FormAlert> : null}
        <form.AppField name="email" validators={{ onBlur: schema.shape.email }}>
          {(field) => (
            <field.TextField label="Email" type="email" autoComplete="email" icon={Mail} />
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
              Remember me
            </Label>
          </div>
          <Link
            to="/forgot-password"
            className="font-medium text-teal underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <form.AppForm>
          <form.SubmitButton className="h-12 w-full text-base">Sign in</form.SubmitButton>
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
          Sign in as trainer
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setMode('learner')}
        >
          Back to learner sign in
        </Button>
      )}

      <SsoButtons redirect={redirect} />
    </AuthShell>
  )
}
