import { Link, useRouter } from '@tanstack/react-router'
import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'
import { useAppForm } from '@/hooks/useAppForm'
import { useRefreshSession } from '@/hooks/useSession'
import { ApiError } from '@/lib/api'
import { safeRedirect } from '@/lib/safe-redirect'
import { type RegisterResult, useRegister } from '../queries/auth.queries'
import { AuthShell } from './AuthShell'
import { AuthSwitch } from './AuthSwitch'
import { FormAlert } from './FormAlert'
import { PasswordField } from './PasswordField'
import { VerifyPanel } from './VerifyPanel'

const schema = z.object({
  name: z.string().trim().min(2, 'Enter your full name'),
  email: z.email('Enter a valid email address'),
  password: z.string().min(8, 'Use at least 8 characters'),
})

const PROGRAMME_NOTE = {
  A: 'You are joining Program A: Tourism Service Professional. After you verify your email you will confirm your enrolment.',
  B: 'New accounts start with Program B: Visitor Service Essentials, a personalised, self-paced programme.',
  C: 'Program C is an illustrative sample. New accounts start with Program B: Visitor Service Essentials.',
} as const

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
            message: 'Registration failed. Check your connection and try again.',
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
      alt={
        programme === 'A'
          ? 'A family walking at the National Museum of Qatar'
          : 'Towers beside a turquoise lagoon in Doha'
      }
      caption={
        <p className="font-display font-light text-3xl leading-snug">
          Explore flexible learning, practise real situations and progress through a journey shaped
          around your role.
        </p>
      }
    >
      <AuthSwitch active="register" redirect={redirect} programme={programme} />
      <div className="grid gap-2">
        <h1 className="font-display font-light text-4xl">Create your account</h1>
        <p className="text-muted-foreground">
          Registration is open to everyone and creates a learner account.
        </p>
      </div>
      <p className="flex gap-2 rounded-lg bg-teal-mist p-3.5 text-sm text-teal-deep">
        <Sparkles aria-hidden className="mt-0.5 size-4 shrink-0" />
        {PROGRAMME_NOTE[programme]}
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
                  Sign in instead
                </Link>
                <Link to="/forgot-password" className="font-medium underline underline-offset-4">
                  Reset your password
                </Link>
              </span>
            ) : null}
          </FormAlert>
        ) : null}
        <form.AppField name="name" validators={{ onBlur: schema.shape.name }}>
          {(field) => <field.TextField label="Full name" autoComplete="name" />}
        </form.AppField>
        <form.AppField name="email" validators={{ onBlur: schema.shape.email }}>
          {(field) => (
            <field.TextField
              label="Email"
              type="email"
              autoComplete="email"
              description="Use a fictional address ending in example.com for this demonstration."
            />
          )}
        </form.AppField>
        <form.AppField name="password" validators={{ onBlur: schema.shape.password }}>
          {() => <PasswordField autoComplete="new-password" hint="At least 8 characters." />}
        </form.AppField>
        <form.AppForm>
          <form.SubmitButton className="h-11 w-full">Create account</form.SubmitButton>
        </form.AppForm>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Next you will verify your email in a simulated step and complete a short profile. Your
          profile helps us recommend relevant learning.
        </p>
      </form>
    </AuthShell>
  )
}
