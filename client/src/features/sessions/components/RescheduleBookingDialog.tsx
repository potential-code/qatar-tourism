import { ArrowRightLeft, Lock } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ApiError } from '@/lib/api'
import { qatarRange } from '@/lib/format/qatar-time'
import { cn } from '@/lib/utils'
import { useMoveBooking } from '../queries/sessions.queries'
import type { CatalogueSession, MyBooking } from '../types'
import { FORMAT_LABEL, locationLabel } from '../utils/session-labels'
import { BookingPolicyNote } from './BookingPolicyNote'

/**
 * Learner reschedule (brief §6): pick another eligible session. The server confirms the new
 * seat before it releases the current one, so a failed move keeps the original booking.
 */
export function RescheduleBookingDialog({
  booking,
  catalogue,
  onOpenChange,
}: {
  booking: MyBooking | null
  catalogue: CatalogueSession[]
  onOpenChange: (open: boolean) => void
}) {
  const move = useMoveBooking()
  const [target, setTarget] = useState<string>('')
  const options = booking
    ? catalogue.filter(
        (s) => s.id !== booking.session.id && s.programmeCode === booking.session.programmeCode,
      )
    : []
  // Holding a seat in this programme is expected here: that is the booking being moved.
  const available = (s: CatalogueSession) =>
    s.eligibility.state === 'bookable' ||
    (s.eligibility.state === 'locked' &&
      s.eligibility.code === 'ACTIVE_RESERVATION' &&
      s.seatsRemaining > 0)
  const blockedReason = (s: CatalogueSession) =>
    s.eligibility.state === 'waitlist'
      ? 'Full. Moving needs a confirmed seat.'
      : s.eligibility.state === 'locked'
        ? s.eligibility.reason
        : s.eligibility.state === 'booked'
          ? 'You already have this session.'
          : ''

  async function confirm() {
    if (!booking || !target) return
    try {
      await move.mutateAsync({ rsvpId: booking.rsvpId, toSessionId: target })
      toast.success('Booking moved. Your new seat is confirmed and the previous seat was released.')
      setTarget('')
      onOpenChange(false)
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'The move could not be saved. Your current seat is kept.',
      )
    }
  }

  return (
    <Dialog open={Boolean(booking)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader className="text-start">
          <DialogTitle className="font-display text-2xl font-normal">
            Reschedule your booking
          </DialogTitle>
          <DialogDescription>
            {booking
              ? `Currently booked: ${booking.session.title}, ${qatarRange(booking.session.startsAt, booking.session.endsAt)}.`
              : null}
          </DialogDescription>
        </DialogHeader>
        <BookingPolicyNote />
        {options.length === 0 ? (
          <p className="rounded-lg bg-sand-deep px-4 py-3 text-sm text-ink-soft">
            There is no other session in this programme right now. Keep your current booking or
            check again later.
          </p>
        ) : (
          <RadioGroup
            value={target}
            onValueChange={setTarget}
            aria-label="Choose a replacement session"
            className="gap-2"
          >
            {options.map((s) => {
              const ok = available(s)
              return (
                <label
                  key={s.id}
                  htmlFor={`move-${s.id}`}
                  className={cn(
                    'flex cursor-pointer gap-3 rounded-xl border bg-card p-3 transition-colors has-[:checked]:border-teal has-[:checked]:bg-teal-mist/50',
                    !ok && 'cursor-not-allowed opacity-70',
                  )}
                >
                  <RadioGroupItem
                    id={`move-${s.id}`}
                    value={s.id}
                    disabled={!ok}
                    className="mt-1"
                  />
                  <span className="grid gap-0.5 text-sm">
                    <span className="font-medium text-ink">{s.title}</span>
                    <span className="text-ink-soft">{qatarRange(s.startsAt, s.endsAt)}</span>
                    <span className="text-muted-foreground">
                      {FORMAT_LABEL[s.format]}, {locationLabel(s)}. {s.trainer.name}.{' '}
                      {s.seatsRemaining} seats left
                    </span>
                    {!ok ? (
                      <span className="flex gap-1.5 text-xs text-ink-soft">
                        <Lock aria-hidden className="mt-0.5 size-3 shrink-0" /> {blockedReason(s)}
                      </span>
                    ) : null}
                  </span>
                </label>
              )
            })}
          </RadioGroup>
        )}
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Keep current booking
          </Button>
          <Button onClick={confirm} disabled={!target || move.isPending}>
            <ArrowRightLeft aria-hidden />
            {move.isPending ? 'Moving' : 'Confirm new session'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
