import { Link } from '@tanstack/react-router'
import { ArrowRight, ClipboardList, MapPin, MonitorPlay } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { cardHover } from '@/components/motion/variants'
import { DateTile } from '@/features/sessions/components/DateTile'
import { FORMAT_LABEL, locationLabel } from '@/features/sessions/utils/session-labels'
import { qatarTime } from '@/lib/format/qatar-time'
import type { TrainerSession } from '../../types'
import { SeatMeter } from '../shared/SeatMeter'
import { SessionStatusBadge } from '../shared/SessionStatusBadge'

export function TrainerSessionCard({ session }: { session: TrainerSession }) {
  const reduce = useReducedMotion()
  const Format = session.format === 'online' ? MonitorPlay : MapPin
  const closed = session.status === 'cancelled' || session.status === 'completed'
  return (
    <motion.div
      initial="rest"
      whileHover={reduce ? undefined : 'hover'}
      variants={cardHover}
      className="rounded-xl bg-card"
    >
      <Link
        to="/trainer/sessions/$sessionId"
        params={{ sessionId: session.id }}
        className="group flex flex-col gap-4 rounded-xl border p-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:flex-row sm:p-5"
      >
        <DateTile iso={session.startsAt} muted={closed} />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <SessionStatusBadge status={session.status} />
            <span className="text-xs text-muted-foreground">
              {session.code}, Program {session.programmeCode}
            </span>
          </div>
          <p className="font-display text-xl leading-snug text-ink group-hover:text-teal-deep">
            {session.title}
          </p>
          <p className="inline-flex items-center gap-1.5 text-sm text-ink-soft">
            <Format aria-hidden className="size-4 text-teal" />
            {qatarTime(session.startsAt)} Qatar time. {FORMAT_LABEL[session.format]},{' '}
            {locationLabel(session)}
          </p>
          {session.attendanceOutstanding > 0 ? (
            <p className="inline-flex items-center gap-1.5 text-sm text-maroon-deep">
              <ClipboardList aria-hidden className="size-4" />
              {session.attendanceOutstanding} attendance records outstanding
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-end justify-between gap-4 sm:w-48 sm:flex-col sm:items-stretch">
          <SeatMeter
            confirmed={session.confirmed}
            capacity={session.capacity}
            waitlisted={session.waitlisted}
            className="flex-1 sm:flex-none"
          />
          <span className="inline-flex items-center gap-1 self-end text-sm font-medium text-teal">
            Manage{' '}
            <ArrowRight
              aria-hidden
              className="size-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100"
            />
          </span>
        </div>
      </Link>
    </motion.div>
  )
}
