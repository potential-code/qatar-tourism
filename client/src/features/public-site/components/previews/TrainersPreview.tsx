import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { PersonAvatar } from '@/components/data/PersonAvatar'
import { Skeleton } from '@/components/ui/skeleton'
import { upcomingSessionsQuery } from '@/features/programmes/queries/programmes.queries'
import {
  formatLabel,
  qatarTimeLabel,
  sessionDay,
  sessionTimeRange,
} from '@/features/programmes/utils/format'

/** Learn with expert trainers: the next three real sessions from the seeded schedule. */
export function TrainersPreview() {
  const { t } = useTranslation('public')
  const { data, isPending, isError } = useQuery(upcomingSessionsQuery())
  if (isPending) return <Skeleton className="h-48 rounded-xl" />
  if (isError || !data) {
    return <p className="text-muted-foreground text-sm">{t('errors.sessionsPreview')}</p>
  }
  return (
    <ul className="grid gap-3">
      {data.slice(0, 3).map((session) => (
        <li
          key={session.id}
          className="flex items-center gap-4 rounded-xl bg-white p-4 ring-1 ring-ink/5"
        >
          <PersonAvatar name={session.trainerName} src={session.trainerAvatar} tone="teal" />
          <div className="grid gap-0.5 text-sm">
            <p className="font-medium">{session.title}</p>
            <p className="text-muted-foreground">
              {session.trainerName}, {formatLabel(session.format)}
            </p>
            <p className="text-muted-foreground">
              {sessionDay(session.startsAt)}, {sessionTimeRange(session.startsAt, session.endsAt)}{' '}
              {qatarTimeLabel()}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}
