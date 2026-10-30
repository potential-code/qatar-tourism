import { CheckCircle2, Hourglass, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
import { ApiError } from '@/lib/api-error'
import { useBookSession } from '../queries/sessions.queries'
import type { CatalogueSession } from '../types'
import { BookingPolicyNote } from './BookingPolicyNote'
import { EligibilityBadge } from './EligibilityBadge'
import { SessionFacts } from './SessionFacts'

/** Session details, the policy, and the one action the learner can take (brief §6). */
export function BookingDialog({
  session,
  offerWindowHours,
  onOpenChange,
}: {
  session: CatalogueSession | null
  /** Seat-offer acceptance window from the demo settings. */
  offerWindowHours: number
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('sessions')
  const book = useBookSession()
  const open = Boolean(session)

  async function confirm(joinWaitlist: boolean) {
    if (!session) return
    try {
      const result = await book.mutateAsync({ sessionId: session.id, joinWaitlist })
      toast.success(
        result.status === 'confirmed'
          ? t('booking.confirmed', { title: session.title })
          : t('booking.waitlisted', { position: result.waitlistPosition, title: session.title }),
      )
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('booking.failed'))
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
                  {t('program', { code: session.programmeCode })}
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
            {session.eligibility.state === 'waitlist' ? (
              <p
                className="flex gap-2 rounded-lg border bg-sand-deep px-3 py-2 text-sm text-ink-soft"
                role="note"
              >
                <Hourglass aria-hidden className="mt-0.5 size-4 shrink-0" />
                {t('booking.fullNote', { hours: offerWindowHours })}
              </p>
            ) : null}
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
                {t('close')}
              </Button>
              {session.eligibility.state === 'bookable' ? (
                <Button onClick={() => confirm(false)} disabled={book.isPending}>
                  <CheckCircle2 aria-hidden />
                  {book.isPending ? t('booking.confirming') : t('booking.confirm')}
                </Button>
              ) : null}
              {session.eligibility.state === 'waitlist' ? (
                <Button onClick={() => confirm(true)} disabled={book.isPending}>
                  <Hourglass aria-hidden />
                  {book.isPending ? t('booking.joining') : t('booking.join')}
                </Button>
              ) : null}
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
