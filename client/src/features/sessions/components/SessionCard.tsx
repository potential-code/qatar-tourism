import { ArrowRight, Lock, MapPin, MonitorPlay } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { PersonAvatar } from '@/components/data/PersonAvatar'
import { cardHover } from '@/components/motion/variants'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useSessionFormat } from '../hooks/useSessionFormat'
import type { CatalogueSession } from '../types'
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
  const { t } = useTranslation('sessions')
  const format = useSessionFormat()
  const reduce = useReducedMotion()
  const locked = session.eligibility.state === 'locked'
  const full = session.eligibility.state === 'waitlist'
  const local = format.localHint(session.startsAt)
  const seatShare = Math.min(
    100,
    Math.round(((session.confirmed + session.offered) / session.capacity) * 100),
  )
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
      // Card button: a concise name that starts with the visible title (WCAG 2.5.3).
      data-a11y-card
      aria-label={t(locked ? 'card.ariaLocked' : 'card.aria', {
        title: session.title,
        code: session.code,
      })}
    >
      <DateTile iso={session.startsAt} muted={locked} className="hidden sm:flex" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-maroon/20 text-maroon-deep">
            {t('program', { code: session.programmeCode })}
          </Badge>
          {session.isCompletionGate ? (
            <span className="text-xs text-muted-foreground">
              {session.level}: {session.stage}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">{t('card.optional')}</span>
          )}
          <span className="ms-auto">
            <EligibilityBadge eligibility={session.eligibility} />
          </span>
        </div>
        <h3 className="font-display text-xl leading-snug font-normal text-ink">{session.title}</h3>
        <p className="text-sm text-ink-soft">
          <span className="sm:hidden">{format.dateShort(session.startsAt)}, </span>
          {format.time(session.startsAt)} {t('qatarTime')},{' '}
          {format.duration(session.durationMinutes)}
          {local ? <span className="text-muted-foreground"> ({local})</span> : null}
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-soft">
          <span className="inline-flex items-center gap-1.5">
            <Format aria-hidden className="size-4 text-teal" />
            {t(`format.${session.format}`)}, {format.location(session)}
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
        {full ? <p className="text-sm font-medium text-warning">{t('card.fullWaitlist')}</p> : null}
      </div>
      <div className="flex shrink-0 flex-row items-center justify-between gap-3 border-t pt-3 sm:w-36 sm:flex-col sm:items-end sm:justify-between sm:border-t-0 sm:border-s sm:ps-5 sm:pt-0">
        <div className="text-start sm:text-end">
          <p className="font-display text-2xl leading-none tabular-nums text-ink">
            {session.seatsRemaining}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('card.seatsLeft', { capacity: session.capacity })}
          </p>
          <div
            className="mt-2 hidden h-1 w-28 overflow-hidden rounded-full bg-stone sm:block"
            aria-hidden
          >
            <div className="h-full rounded-full bg-teal" style={{ width: `${seatShare}%` }} />
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-sm font-medium text-teal">
          {t('card.details')}
          <ArrowRight
            aria-hidden
            className="size-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1"
          />
        </span>
      </div>
    </motion.button>
  )
}
