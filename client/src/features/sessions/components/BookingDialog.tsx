import { CheckCircle2, Hourglass, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
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
import { useBookSession } from '../queries/sessions.queries'
import type { CatalogueSession } from '../types'
import { BookingPolicyNote } from './BookingPolicyNote'
import { EligibilityBadge } from './EligibilityBadge'
import { SessionFacts } from './SessionFacts'

/** Session details, the policy, and the one action the learner can take (brief §6). */
export function BookingDialog({
  session,
  onOpenChange,
}: {
  session: CatalogueSession | null
  onOpenChange: (open: boolean) => void
}) {
  const book = useBookSession()
  const open = Boolean(session)

  async function confirm(joinWaitlist: boolean) {
    if (!session) return
    try {
      const result = await book.mutateAsync({ sessionId: session.id, joinWaitlist })
      toast.success(
        result.status === 'confirmed'
          ? `Booking confirmed: ${session.title}. It is now in My sessions.`
          : `You are number ${result.waitlistPosition} on the waitlist for ${session.title}.`,
      )
      onOpenChange(false)
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : 'The booking could not be saved. Try again.',
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        {session ? (
          <>
            <DialogHeader className="gap-2 text-start">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-maroon/20 text-maroon-deep">
                  Program {session.programmeCode}
                </Badge>
                <span className="text-xs text-muted-foreground">{session.code}</span>
                <EligibilityBadge eligibility={session.eligibility} />
              </div>
              <DialogTitle className="font-display text-2xl font-normal">
                {session.title}
              </DialogTitle>
              <DialogDescription>{session.description}</DialogDescription>
            </DialogHeader>
            <SessionFacts session={session} className="rounded-xl bg-sand p-4" />
            <BookingPolicyNote policy={session.cancellationPolicy} />
            {session.eligibility.state === 'locked' ? (
              <p
                className="flex gap-2 rounded-lg border bg-sand-deep px-3 py-2 text-sm text-ink-soft"
                role="note"
              >
                <Lock aria-hidden className="mt-0.5 size-4 shrink-0" />
                {session.eligibility.reason}
              </p>
            ) : null}
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {session.eligibility.state === 'bookable' ? (
                <Button onClick={() => confirm(false)} disabled={book.isPending}>
                  <CheckCircle2 aria-hidden />
                  {book.isPending ? 'Confirming' : 'Confirm booking'}
                </Button>
              ) : null}
              {session.eligibility.state === 'waitlist' ? (
                <Button onClick={() => confirm(true)} disabled={book.isPending}>
                  <Hourglass aria-hidden />
                  {book.isPending ? 'Joining' : 'Join the waitlist'}
                </Button>
              ) : null}
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
