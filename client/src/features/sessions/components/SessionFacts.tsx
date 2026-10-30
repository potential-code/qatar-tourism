import { Clock, Hourglass, Lock, MapPin, MonitorPlay, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { PersonAvatar } from '@/components/data/PersonAvatar'
import { SimulatedTag } from '@/components/layout/SimulatedTag'
import { cn } from '@/lib/utils'
import { useSessionFormat } from '../hooks/useSessionFormat'
import type { SessionInfo } from '../types'

function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Clock
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex gap-3">
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-teal" />
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="text-sm text-ink">{children}</dd>
      </div>
    </div>
  )
}

/** Every booking fact the brief asks for (§6): date, Qatar time, duration, format, place, trainer, seats, prerequisite. */
export function SessionFacts({ session, className }: { session: SessionInfo; className?: string }) {
  const { t } = useTranslation('sessions')
  const format = useSessionFormat()
  const local = format.localHint(session.startsAt)
  const Format = session.format === 'online' ? MonitorPlay : MapPin
  return (
    <dl className={cn('grid gap-4 sm:grid-cols-2', className)}>
      <Fact icon={Clock} label={t('facts.dateTime')}>
        {format.range(session.startsAt, session.endsAt)}
        {local ? <span className="block text-xs text-muted-foreground">{local}</span> : null}
      </Fact>
      <Fact icon={Hourglass} label={t('facts.duration')}>
        {format.duration(session.durationMinutes)}
      </Fact>
      <Fact icon={Format} label={t(`format.${session.format}`)}>
        {format.location(session)}
        {session.format === 'online' ? (
          <SimulatedTag label={t('facts.simulatedRoom')} className="mt-1" />
        ) : session.accessNote ? (
          <span className="block text-xs text-muted-foreground">{session.accessNote}</span>
        ) : null}
      </Fact>
      <Fact icon={Users} label={t('facts.seats')}>
        {session.seatsRemaining > 0
          ? t('facts.remaining', { left: session.seatsRemaining, capacity: session.capacity })
          : session.waitlisted
            ? t('facts.fullWaitlist', { count: session.waitlisted })
            : t('facts.full')}
        {session.offered > 0 ? (
          <span className="block text-xs text-muted-foreground">
            {t('facts.reserved', { count: session.offered })}
          </span>
        ) : null}
      </Fact>
      <Fact icon={Lock} label={t('facts.prerequisite')}>
        {session.prerequisite === 'a_level1_complete'
          ? t('facts.level1')
          : (session.prerequisite ?? t('facts.none'))}
      </Fact>
      <div className="flex items-center gap-3">
        <PersonAvatar name={session.trainer.name} src={session.trainer.avatarPath} tone="maroon" />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{t('facts.trainer')}</p>
          <p className="truncate text-sm text-ink">
            {session.trainer.name}
            <span className="text-muted-foreground">, {session.trainer.headline}</span>
          </p>
        </div>
      </div>
    </dl>
  )
}
