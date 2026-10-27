import { Loader2, RotateCw } from 'lucide-react'
import { type FormEvent, useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiError } from '@/lib/api'
import { authClient } from '@/lib/auth-client'
import {
  type SimulatedEmail,
  useResendSimulated,
  useVerifySimulated,
} from '../queries/auth.queries'
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
  rememberMe = true,
  onSignedIn,
}: {
  email: string
  password: string
  initial: SimulatedEmail | null
  rememberMe?: boolean
  onSignedIn: () => Promise<void>
}) {
  const id = useId()
  const [inbox, setInbox] = useState<SimulatedEmail | null>(initial)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [signingIn, setSigningIn] = useState(false)
  const verify = useVerifySimulated()
  const resend = useResendSimulated()

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the six-digit code from the demo inbox.')
      return
    }
    try {
      await verify.mutateAsync({ email, code })
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : 'Verification failed. Try again.')
      return
    }
    setSigningIn(true)
    const { error: signInError } = await authClient.signIn.email({ email, password, rememberMe })
    if (signInError) {
      setSigningIn(false)
      setError('Your email is verified. Sign in with your email and password to continue.')
      return
    }
    await onSignedIn()
  }

  async function requestCode() {
    setError(null)
    const result = await resend.mutateAsync(email).catch(() => null)
    if (result?.simulatedEmail) setInbox(result.simulatedEmail)
    else setError('A new code could not be issued. If you already verified, sign in instead.')
  }

  const busy = verify.isPending || signingIn
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h1 className="font-display font-light text-4xl">Verify your email</h1>
        <p className="text-muted-foreground">
          This demonstration does not send real email. Your verification code is shown in the demo
          inbox below.
        </p>
      </div>
      {inbox ? <SimulatedInbox email={inbox} /> : null}
      <form noValidate onSubmit={submit} className="grid gap-4">
        {error ? <FormAlert>{error}</FormAlert> : null}
        <div className="grid gap-2">
          <Label htmlFor={id}>Six-digit code</Label>
          <Input
            id={id}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            className="h-12 text-center font-display text-2xl tracking-[0.4em]"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? <Loader2 aria-hidden className="animate-spin" /> : null}
            Verify and continue
          </Button>
          {inbox ? (
            <Button type="button" size="lg" variant="outline" onClick={() => setCode(inbox.code)}>
              Use the demo code
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
          {inbox ? 'Send a new demo code' : 'Show my demo code'}
        </Button>
      </form>
    </div>
  )
}
