import { ArrowRight, Lock, MapPin, MonitorPlay } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { PersonAvatar } from '@/components/data/PersonAvatar'
import { cardHover } from '@/components/motion/variants'
import { Badge } from '@/components/ui/badge'
import { learnerLocal, qatarDateShort, qatarTime } from '@/lib/format/qatar-time'
import { cn } from '@/lib/utils'
import type { CatalogueSession } from '../types'
import { durationLabel, FORMAT_LABEL, locationLabel } from '../utils/session-labels'
import { DateTile } from './DateTile'
import { EligibilityBadge } from './EligibilityBadge'

/** One bookable session in the list view. The whole card opens the booking dialog. */
export function SessionCard({
  session,
  onOpen,
}: {
  session: CatalogueSession
  onOpen: () => void
}) {
  const reduce = useReducedMotion()
  const locked = session.eligibility.state === 'locked'
  const local = learnerLocal(session.startsAt)
  const seatShare = Math.min(100, Math.round((session.confirmed / session.capacity) * 100))
  const Format = session.format === 'online' ? MonitorPlay : MapPin

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial="rest"
      whileHover={reduce ? undefined : 'hover'}
      whileTap={reduce ? undefined : 'press'}
      variants={cardHover}
      className={cn(
        'group flex w-full flex-col gap-4 rounded-xl border bg-card p-4 text-start focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:flex-row sm:items-stretch sm:p-5',
        locked && 'bg-card/70',
      )}
      aria-label={`${session.title}, ${session.code}. ${locked ? 'Locked.' : ''} View details`}
    >
      <DateTile iso={session.startsAt} muted={locked} className="hidden sm:flex" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-maroon/20 text-maroon-deep">
            Program {session.programmeCode}
          </Badge>
          {session.isCompletionGate ? (
            <span className="text-xs text-muted-foreground">
              {session.level}: {session.stage}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Optional session</span>
          )}
          <span className="ms-auto">
            <EligibilityBadge eligibility={session.eligibility} />
          </span>
        </div>
        <h3 className="font-display text-xl leading-snug font-normal text-ink">{session.title}</h3>
        <p className="text-sm text-ink-soft">
          <span className="sm:hidden">{qatarDateShort(session.startsAt)}, </span>
          {qatarTime(session.startsAt)} Qatar time, {durationLabel(session.durationMinutes)}
          {local ? <span className="text-muted-foreground"> ({local})</span> : null}
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-soft">
          <span className="inline-flex items-center gap-1.5">
            <Format aria-hidden className="size-4 text-teal" />
            {FORMAT_LABEL[session.format]}, {locationLabel(session)}
          </span>
          <span className="inline-flex items-center gap-2">
            <PersonAvatar
              name={session.trainer.name}
              src={session.trainer.avatarPath}
              tone="maroon"
              className="size-6"
            />
            {session.trainer.name}
          </span>
        </div>
        {session.eligibility.state === 'locked' ? (
          <p className="flex gap-2 rounded-lg bg-sand-deep px-3 py-2 text-sm text-ink-soft">
            <Lock aria-hidden className="mt-0.5 size-4 shrink-0" />
            {session.eligibility.reason}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-row items-center justify-between gap-3 border-t pt-3 sm:w-36 sm:flex-col sm:items-end sm:justify-between sm:border-t-0 sm:border-s sm:ps-5 sm:pt-0">
        <div className="text-start sm:text-end">
          <p className="font-display text-2xl leading-none tabular-nums text-ink">
            {session.seatsRemaining}
          </p>
          <p className="text-xs text-muted-foreground">of {session.capacity} seats left</p>
          <div
            className="mt-2 hidden h-1 w-28 overflow-hidden rounded-full bg-stone sm:block"
            aria-hidden
          >
            <div className="h-full rounded-full bg-teal" style={{ width: `${seatShare}%` }} />
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-sm font-medium text-teal">
          Details
          <ArrowRight
            aria-hidden
            className="size-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100"
          />
        </span>
      </div>
    </motion.button>
  )
}
