import { ArrowRightLeft, Lock } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { ApiError } from '@/lib/api-error'
import { cn } from '@/lib/utils'
import { useSessionFormat } from '../hooks/useSessionFormat'
import { useMoveBooking } from '../queries/sessions.queries'
import type { CatalogueSession, MyBooking } from '../types'
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
  const { t } = useTranslation('sessions')
  const format = useSessionFormat()
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
      ? t('moveDialog.fullBlocked')
      : s.eligibility.state === 'locked'
        ? s.eligibility.reason
        : s.eligibility.state === 'booked'
          ? t('moveDialog.haveThis')
          : ''

  async function confirm() {
    if (!booking || !target) return
    try {
      await move.mutateAsync({ rsvpId: booking.rsvpId, toSessionId: target })
      toast.success(t('moveDialog.moved'))
      setTarget('')
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('moveDialog.failed'))
    }
  }

  return (
    <Dialog open={Boolean(booking)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader className="text-start">
          <DialogTitle className="font-display text-2xl font-normal">
            {t('moveDialog.title')}
          </DialogTitle>
          <DialogDescription>
            {booking
              ? t('moveDialog.current', {
                  title: booking.session.title,
                  when: format.range(booking.session.startsAt, booking.session.endsAt),
                })
              : null}
          </DialogDescription>
        </DialogHeader>
        <BookingPolicyNote />
        {options.length === 0 ? (
          <p className="rounded-lg bg-sand-deep px-4 py-3 text-sm text-ink-soft">
            {t('moveDialog.none')}
          </p>
        ) : (
          <RadioGroup
            value={target}
            onValueChange={setTarget}
            aria-label={t('moveDialog.choose')}
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
                    <span className="text-ink-soft">{format.range(s.startsAt, s.endsAt)}</span>
                    <span className="text-muted-foreground">
                      {t(`format.${s.format}`)}, {format.location(s)}. {s.trainer.name}.{' '}
                      {t('moveDialog.seatsLeft', { count: s.seatsRemaining })}
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
            {t('moveDialog.keep')}
          </Button>
          <Button onClick={confirm} disabled={!target || move.isPending}>
            <ArrowRightLeft aria-hidden />
            {move.isPending ? t('moveDialog.moving') : t('moveDialog.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
