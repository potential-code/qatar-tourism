import { Fingerprint } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { IdpAssertion } from '@/services/sso-test.service'

/**
 * The mock identity-provider step. It is styled as a separate sign-in page so the presenter can
 * show the hand-off; every control here is simulated and nothing leaves the browser.
 */
export function IdpDialog({
  open,
  onOpenChange,
  assertion,
  pending,
  onChoose,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  assertion: IdpAssertion | null
  pending: boolean
  onChoose: (outcome: 'approve' | 'fail') => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-md">
        <div className="bg-slate-900 px-6 py-5 text-white">
          <p className="flex items-center gap-2 text-xs tracking-wide text-white/70 uppercase">
            <Fingerprint aria-hidden className="size-4" />
            {assertion?.providerName ?? 'Identity provider'}
          </p>
          <DialogHeader className="mt-2 text-start">
            <DialogTitle className="text-xl font-normal text-white">
              Sign in to continue to the Academy
            </DialogTitle>
            <DialogDescription className="text-white/70">
              Simulated identity provider ({assertion?.protocol ?? 'SAML'}). No real sign in
              happens.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="grid gap-4 px-6 py-5">
          <div className="grid gap-1 rounded-lg border bg-sand/60 p-4 text-sm">
            <p className="font-medium text-ink">{assertion?.displayName}</p>
            <p className="text-muted-foreground">{assertion?.email}</p>
            <p className="text-xs text-muted-foreground">Group: {assertion?.groups.join(', ')}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Continuing sends this identity back to the Academy, which matches it to the existing
            learner account.
          </p>
        </div>
        <DialogFooter className="px-6 pb-5">
          <Button variant="ghost" disabled={pending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="outline" disabled={pending} onClick={() => onChoose('fail')}>
            Simulate failed login
          </Button>
          <Button disabled={pending} onClick={() => onChoose('approve')}>
            {pending
              ? 'Checking identity'
              : `Continue as ${assertion?.displayName.split(' ')[0] ?? 'learner'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
