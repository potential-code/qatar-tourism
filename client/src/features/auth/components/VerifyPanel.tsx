import { Loader2, RotateCw } from 'lucide-react'
import { type FormEvent, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api-error'
import {
  type SimulatedEmail,
  useResendSimulated,
  useVerifySimulated,
} from '../queries/auth.queries'
import { useSignIn } from '../queries/session.queries'
import { FormAlert } from './FormAlert'
import { SimulatedInbox } from './SimulatedInbox'

/**
 * The explicitly marked simulated verification step (brief §3). After the code is accepted the
 * learner is signed in with the password they just entered, then `onSignedIn` routes them on.
 */
export function VerifyPanel({
  email,
  password,
  initial,
  onSignedIn,
}: {
  email: string
  password: string
  initial: SimulatedEmail | null
  /** Accepted for the sign-in form; the demo session always persists in this browser. */
  rememberMe?: boolean
  onSignedIn: () => Promise<void>
}) {
  const { t } = useTranslation('auth')
  const id = useId()
  const [inbox, setInbox] = useState<SimulatedEmail | null>(initial)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [signingIn, setSigningIn] = useState(false)
  const verify = useVerifySimulated()
  const resend = useResendSimulated()
  const signIn = useSignIn()

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!/^\d{6}$/.test(code)) {
      setError(t('validation.code'))
      return
    }
    try {
      await verify.mutateAsync({ email, code })
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : t('verify.failed'))
      return
    }
    setSigningIn(true)
    const signedIn = await signIn
      .mutateAsync({ email, password })
      .then(() => true)
      .catch(() => false)
    if (!signedIn) {
      setSigningIn(false)
      setError(t('verify.signInAfter'))
      return
    }
    await onSignedIn()
  }

  async function requestCode() {
    setError(null)
    const result = await resend.mutateAsync(email).catch(() => null)
    if (result?.simulatedEmail) setInbox(result.simulatedEmail)
    else setError(t('verify.noCode'))
  }

  const busy = verify.isPending || signingIn
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h1 className="font-display font-light text-4xl rtl:leading-[1.4]">{t('verify.title')}</h1>
        <p className="text-muted-foreground">{t('verify.intro')}</p>
      </div>
      {inbox ? <SimulatedInbox email={inbox} /> : null}
      <form noValidate onSubmit={submit} className="grid gap-4">
        {error ? <FormAlert>{error}</FormAlert> : null}
        <div className="grid gap-2">
          <Label htmlFor={id}>{t('verify.codeLabel')}</Label>
          <Input
            id={id}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            dir="ltr"
            className="h-12 text-center font-display text-2xl tracking-[0.4em]"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? <Loader2 aria-hidden className="animate-spin" /> : null}
            {t('verify.submit')}
          </Button>
          {inbox ? (
            <Button type="button" size="lg" variant="outline" onClick={() => setCode(inbox.code)}>
              {t('verify.useDemo')}
            </Button>
          ) : null}
        </div>
        <Button
          type="button"
          variant="link"
          className="w-fit px-0"
          onClick={requestCode}
          disabled={resend.isPending}
        >
          <RotateCw aria-hidden />
          {inbox ? t('verify.resend') : t('verify.show')}
        </Button>
      </form>
    </div>
  )
}
