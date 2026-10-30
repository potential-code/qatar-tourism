import {
  ArrowRightLeft,
  BellRing,
  CalendarCheck2,
  Hourglass,
  MapPin,
  MonitorPlay,
  XCircle,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api-error'
import { cn } from '@/lib/utils'
import { useSessionFormat } from '../hooks/useSessionFormat'
import { useLeaveWaitlist } from '../queries/sessions.queries'
import type { MyBooking } from '../types'
import { DateTile } from './DateTile'
import { OfferCard } from './OfferCard'

/** One of the learner's bookings, with the actions the policy allows right now. */
export function MyBookingCard({
  booking,
  upcoming,
  now,
  onReschedule,
  onChange,
}: {
  booking: MyBooking
  upcoming: boolean
  /** Demo clock reading with the booking data, for the offer countdown. */
  now: string
  onReschedule: () => void
  onChange: () => void
}) {
  const { t } = useTranslation('sessions')
  const format = useSessionFormat()
  const leave = useLeaveWaitlist()
  const s = booking.session
  const waitlisted = booking.status === 'waitlisted'
  const offered = booking.status === 'offered'
  const active = booking.status === 'confirmed' || waitlisted || offered
  const academyCancelled = s.status === 'cancelled'
  const local = format.localHint(s.startsAt)
  const Format = s.format === 'online' ? MonitorPlay : MapPin

  async function leaveWaitlist() {
    try {
      await leave.mutateAsync(booking.rsvpId)
      toast.success(t('myBooking.left'))
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('myBooking.leaveFailed'))
    }
  }

  return (
    <article
      className={cn(
        'flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-xs sm:flex-row sm:p-5',
        booking.rescheduled && active && 'border-maroon/25',
        offered && 'border-warning/40',
      )}
    >
      <DateTile iso={s.startsAt} muted={!upcoming || !active} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className={cn(
              booking.status === 'confirmed' && 'bg-teal text-white',
              (waitlisted || offered) && 'bg-warning/15 text-warning',
              !active && 'bg-sand-deep text-ink-soft',
            )}
          >
            {booking.status === 'confirmed' ? (
              <CalendarCheck2 aria-hidden />
            ) : offered ? (
              <BellRing aria-hidden />
            ) : waitlisted ? (
              <Hourglass aria-hidden />
            ) : (
              <XCircle aria-hidden />
            )}
            {t(`status.${booking.status}`, { position: booking.waitlistPosition ?? '' })}
          </Badge>
          {booking.rescheduled && active ? (
            <Badge variant="outline" className="border-maroon/25 bg-maroon-mist text-maroon-deep">
              <BellRing aria-hidden /> {t('myBooking.rescheduled')}
            </Badge>
          ) : null}
          <span className="text-xs text-muted-foreground">{s.code}</span>
        </div>
        <h3 className="font-display text-xl leading-snug font-normal text-ink">{s.title}</h3>
        <p className="text-sm text-ink-soft">
          {format.range(s.startsAt, s.endsAt)}
          {local ? <span className="text-muted-foreground"> ({local})</span> : null}
        </p>
        <p className="inline-flex items-center gap-1.5 text-sm text-ink-soft">
          <Format aria-hidden className="size-4 text-teal" />
          {t('myBooking.trainerLine', {
            format: t(`format.${s.format}`),
            location: format.location(s),
            name: s.trainer.name,
          })}
        </p>
        {booking.rescheduled && active ? (
          <p className="rounded-lg bg-maroon-mist/60 px-3 py-2 text-sm text-maroon-deep">
            {t('myBooking.movedFrom', {
              from: format.dateTime(booking.rescheduled.previousStartsAt),
              reason: booking.rescheduled.reason,
            })}
          </p>
        ) : null}
        {offered && booking.offer ? (
          <OfferCard
            rsvpId={booking.rsvpId}
            expiresAt={booking.offer.expiresAt}
            sessionTitle={s.title}
            now={now}
          />
        ) : null}
        {waitlisted ? (
          <p className="rounded-lg bg-sand-deep px-3 py-2 text-sm text-ink-soft">
            {booking.waitlistPosition ? (
              <span className="block font-medium text-ink">
                {t('myBooking.positionLine', { position: booking.waitlistPosition })}
              </span>
            ) : null}
            {t('myBooking.waitlistNote')}
          </p>
        ) : null}
        {academyCancelled ? (
          <p className="rounded-lg bg-sand-deep px-3 py-2 text-sm text-ink-soft">
            {t('myBooking.academyCancelled', { reason: s.cancelledReason ?? '' })}
          </p>
        ) : booking.status === 'moved' ? (
          <p className="text-sm text-muted-foreground">{t('myBooking.youMoved')}</p>
        ) : null}
        {booking.attendance && !upcoming ? (
          <p className="text-sm text-ink-soft">
            {t('myBooking.attendance')}{' '}
            <span className="font-medium">{t(`attendance.${booking.attendance}`)}</span>
            {booking.score !== null ? <> {t('myBooking.score', { score: booking.score })}</> : null}
          </p>
        ) : null}
        {booking.feedback ? (
          <p className="text-sm text-muted-foreground">
            {t('myBooking.feedback', { text: booking.feedback })}
          </p>
        ) : null}
      </div>
      {active && upcoming ? (
        <div className="flex shrink-0 flex-wrap items-start gap-2 sm:flex-col sm:items-end">
          {waitlisted ? (
            <Button size="sm" variant="outline" onClick={leaveWaitlist} disabled={leave.isPending}>
              {leave.isPending ? t('myBooking.leaving') : t('myBooking.leaveWaitlist')}
            </Button>
          ) : offered ? null : booking.selfServiceOpen ? (
            <>
              <Button size="sm" onClick={onReschedule}>
                <ArrowRightLeft aria-hidden /> {t('myBooking.reschedule')}
              </Button>
              <Button size="sm" variant="ghost" onClick={onChange}>
                {t('myBooking.cancel')}
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={onChange}>
                {t('myBooking.requestChange')}
              </Button>
              <p className="max-w-48 text-xs text-muted-foreground sm:text-end">
                {t('myBooking.within24')}
              </p>
            </>
          )}
        </div>
      ) : null}
    </article>
  )
}
