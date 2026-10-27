import {
  ArrowRightLeft,
  BellRing,
  CalendarCheck2,
  Hourglass,
  MapPin,
  MonitorPlay,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { learnerLocal, qatarDateTime, qatarRange } from '@/lib/format/qatar-time'
import { cn } from '@/lib/utils'
import type { MyBooking } from '../types'
import { ATTENDANCE_LABEL, FORMAT_LABEL, locationLabel, RSVP_LABEL } from '../utils/session-labels'
import { DateTile } from './DateTile'

/** One of the learner's bookings, with the actions the policy allows right now. */
export function MyBookingCard({
  booking,
  upcoming,
  onReschedule,
  onChange,
}: {
  booking: MyBooking
  upcoming: boolean
  onReschedule: () => void
  onChange: () => void
}) {
  const s = booking.session
  const active = booking.status === 'confirmed' || booking.status === 'waitlisted'
  const academyCancelled = s.status === 'cancelled'
  const local = learnerLocal(s.startsAt)
  const Format = s.format === 'online' ? MonitorPlay : MapPin

  return (
    <article
      className={cn(
        'flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-xs sm:flex-row sm:p-5',
        booking.rescheduled && active && 'border-maroon/25',
      )}
    >
      <DateTile iso={s.startsAt} muted={!upcoming || !active} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className={cn(
              booking.status === 'confirmed' && 'bg-teal text-white',
              booking.status === 'waitlisted' && 'bg-warning/15 text-warning',
              !active && 'bg-sand-deep text-ink-soft',
            )}
          >
            {booking.status === 'confirmed' ? (
              <CalendarCheck2 aria-hidden />
            ) : booking.status === 'waitlisted' ? (
              <Hourglass aria-hidden />
            ) : (
              <XCircle aria-hidden />
            )}
            {booking.status === 'waitlisted'
              ? `Waitlist position ${booking.waitlistPosition ?? ''}`
              : RSVP_LABEL[booking.status]}
          </Badge>
          {booking.rescheduled && active ? (
            <Badge variant="outline" className="border-maroon/25 bg-maroon-mist text-maroon-deep">
              <BellRing aria-hidden /> Rescheduled by your trainer
            </Badge>
          ) : null}
          <span className="text-xs text-muted-foreground">{s.code}</span>
        </div>
        <h3 className="font-display text-xl leading-snug font-normal text-ink">{s.title}</h3>
        <p className="text-sm text-ink-soft">
          {qatarRange(s.startsAt, s.endsAt)}
          {local ? <span className="text-muted-foreground"> ({local})</span> : null}
        </p>
        <p className="inline-flex items-center gap-1.5 text-sm text-ink-soft">
          <Format aria-hidden className="size-4 text-teal" />
          {FORMAT_LABEL[s.format]}, {locationLabel(s)}. Trainer: {s.trainer.name}
        </p>
        {booking.rescheduled && active ? (
          <p className="rounded-lg bg-maroon-mist/60 px-3 py-2 text-sm text-maroon-deep">
            Moved from {qatarDateTime(booking.rescheduled.previousStartsAt)}. Reason:{' '}
            {booking.rescheduled.reason} If the new time does not work for you, choose another
            eligible session.
          </p>
        ) : null}
        {academyCancelled ? (
          <p className="rounded-lg bg-sand-deep px-3 py-2 text-sm text-ink-soft">
            This session was cancelled by the Academy. {s.cancelledReason} Your learning progress is
            saved. Choose another available session below.
          </p>
        ) : booking.status === 'moved' ? (
          <p className="text-sm text-muted-foreground">
            You moved this booking to another session.
          </p>
        ) : null}
        {booking.attendance && !upcoming ? (
          <p className="text-sm text-ink-soft">
            Attendance: <span className="font-medium">{ATTENDANCE_LABEL[booking.attendance]}</span>
            {booking.score !== null ? (
              <>
                {' '}
                Session score: <span className="font-medium">{booking.score}/100</span>
              </>
            ) : null}
          </p>
        ) : null}
        {booking.feedback ? (
          <p className="text-sm text-muted-foreground">Trainer feedback: {booking.feedback}</p>
        ) : null}
      </div>
      {active && upcoming ? (
        <div className="flex shrink-0 flex-wrap items-start gap-2 sm:flex-col sm:items-end">
          {booking.selfServiceOpen ? (
            <>
              <Button size="sm" onClick={onReschedule}>
                <ArrowRightLeft aria-hidden /> Reschedule
              </Button>
              <Button size="sm" variant="ghost" onClick={onChange}>
                Cancel booking
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={onChange}>
                Request a change
              </Button>
              <p className="max-w-48 text-xs text-muted-foreground sm:text-end">
                Starts within 24 hours. Changes need admin review.
              </p>
            </>
          )}
        </div>
      ) : null}
    </article>
  )
}
