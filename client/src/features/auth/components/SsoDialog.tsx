import { Loader2 } from 'lucide-react'
import { SimulatedTag } from '@/components/layout'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ApiError } from '@/lib/api'
import { useAfterSignIn } from '../hooks/useAfterSignIn'
import { useSimulatedSso } from '../queries/auth.queries'
import { FormAlert } from './FormAlert'

export type SsoProvider = 'qatar-tourism' | 'organisation'

const COPY: Record<SsoProvider, { title: string; account: string; detail: string }> = {
  'qatar-tourism': {
    title: 'Continue with Qatar Tourism account',
    account: 'Amira Al Ansari, fictional learner L0013',
    detail:
      'In production this would hand you to a Qatar Tourism identity provider and link your CRM record.',
  },
  organisation: {
    title: 'Continue with organisation account',
    account: 'Rania Al Thani, fictional learner L0016 at Demo Corniche Residences',
    detail:
      'In production this would hand you to your employer’s identity provider and match your organisation.',
  },
}

/** Explains the simulated connection before using the mock account (brief §1, §3). */
export function SsoDialog({
  provider,
  redirect,
  onClose,
}: {
  provider: SsoProvider | null
  redirect?: string
  onClose: () => void
}) {
  const sso = useSimulatedSso()
  const afterSignIn = useAfterSignIn()
  const copy = provider ? COPY[provider] : null

  async function continueWithMock() {
    if (!provider) return
    await sso.mutateAsync(provider)
    onClose()
    await afterSignIn({ redirect })
  }

  return (
    <Dialog open={provider !== null} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="rounded-xl sm:max-w-lg">
        {copy ? (
          <>
            <DialogHeader className="gap-3 text-start">
              <SimulatedTag label="Simulated connection" className="w-fit" />
              <DialogTitle className="font-display font-light text-2xl">{copy.title}</DialogTitle>
              <DialogDescription className="leading-relaxed">
                This demonstration does not connect to a real identity provider. Nothing is
                authenticated by Qatar Tourism or your organisation. {copy.detail} The actual
                provider, claims, account linking and CRM APIs must be confirmed later.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-1 rounded-lg bg-sand p-4 text-sm">
              <p className="text-muted-foreground text-xs">Mock account used in demo mode</p>
              <p className="font-medium">{copy.account}</p>
            </div>
            {sso.isError ? (
              <FormAlert>
                {sso.error instanceof ApiError && sso.error.status === 429
                  ? 'Too many attempts. Wait a few minutes and try again.'
                  : 'The mock account is not available right now. Use email and password instead.'}
              </FormAlert>
            ) : null}
            <DialogFooter className="gap-2 sm:justify-start">
              <Button onClick={continueWithMock} disabled={sso.isPending}>
                {sso.isPending ? <Loader2 aria-hidden className="animate-spin" /> : null}
                Continue with mock account
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
