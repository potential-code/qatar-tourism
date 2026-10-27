import { Clock, Hourglass, Lock, MapPin, MonitorPlay, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { SimulatedTag } from '@/components/layout/SimulatedTag'
import { learnerLocal, qatarRange } from '@/lib/format/qatar-time'
import { cn } from '@/lib/utils'
import type { SessionInfo } from '../types'
import {
  durationLabel,
  FORMAT_LABEL,
  locationLabel,
  PREREQUISITE_LABEL,
} from '../utils/session-labels'
import { TrainerAvatar } from './TrainerAvatar'

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
  const local = learnerLocal(session.startsAt)
  const Format = session.format === 'online' ? MonitorPlay : MapPin
  return (
    <dl className={cn('grid gap-4 sm:grid-cols-2', className)}>
      <Fact icon={Clock} label="Date and Qatar time">
        {qatarRange(session.startsAt, session.endsAt)}
        {local ? <span className="block text-xs text-muted-foreground">{local}</span> : null}
      </Fact>
      <Fact icon={Hourglass} label="Duration">
        {durationLabel(session.durationMinutes)}
      </Fact>
      <Fact icon={Format} label={FORMAT_LABEL[session.format]}>
        {locationLabel(session)}
        {session.format === 'online' ? (
          <SimulatedTag label="Simulated online classroom" className="mt-1" />
        ) : session.accessNote ? (
          <span className="block text-xs text-muted-foreground">{session.accessNote}</span>
        ) : null}
      </Fact>
      <Fact icon={Users} label="Seats">
        {session.seatsRemaining > 0
          ? `${session.seatsRemaining} of ${session.capacity} remaining`
          : `Full${session.waitlisted ? `, ${session.waitlisted} on the waitlist` : ''}`}
      </Fact>
      <Fact icon={Lock} label="Prerequisite">
        {session.prerequisite
          ? (PREREQUISITE_LABEL[session.prerequisite] ?? session.prerequisite)
          : 'None. Optional session'}
      </Fact>
      <div className="flex items-center gap-3">
        <TrainerAvatar name={session.trainer.name} avatarPath={session.trainer.avatarPath} />
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Trainer</p>
          <p className="truncate text-sm text-ink">
            {session.trainer.name}
            <span className="text-muted-foreground">, {session.trainer.headline}</span>
          </p>
        </div>
      </div>
    </dl>
  )
}
