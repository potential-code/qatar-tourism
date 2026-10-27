import type { SessionStatus } from '@shared/constants'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { BellRing, CalendarPlus, CalendarX2, Plus } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Reveal } from '@/components/motion/Reveal'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { QueryErrorPanel } from '@/features/sessions/components/QueryErrorPanel'
import { STATUS_LABEL } from '@/features/sessions/utils/session-labels'
import { trainerSessionsQuery } from '../../queries/trainer.queries'
import { WorkspaceSkeleton } from '../shared/WorkspaceSkeleton'
import { TrainerSessionCard } from './TrainerSessionCard'

const FILTERS: (SessionStatus | 'all')[] = [
  'all',
  'draft',
  'published',
  'full',
  'completed',
  'cancelled',
]

/** My sessions (brief §10): every session this trainer runs, by state. */
export function TrainerSessionsPage() {
  const [filter, setFilter] = useState<SessionStatus | 'all'>('all')
  const sessions = useQuery(trainerSessionsQuery())

  const header = (
    <PageHeader
      image="trainerSessions"
      title="My sessions"
      description="Create, publish, reschedule and cancel your sessions. Times are Qatar time."
      actions={
        <>
          <Button asChild variant="outline">
            <Link to="/trainer/sessions/notification-log">
              <BellRing aria-hidden /> Notification log
            </Link>
          </Button>
          <Button asChild>
            <Link to="/trainer/sessions/new">
              <Plus aria-hidden /> Create session
            </Link>
          </Button>
        </>
      }
    />
  )
  if (sessions.isPending)
    return (
      <>
        {header}
        <WorkspaceSkeleton rows={5} />
      </>
    )
  if (sessions.isError)
    return (
      <>
        {header}
        <QueryErrorPanel error={sessions.error} onRetry={() => sessions.refetch()} />
      </>
    )

  const counts = new Map<string, number>()
  for (const s of sessions.data.items) counts.set(s.status, (counts.get(s.status) ?? 0) + 1)
  const now = sessions.data.now
  const visible = sessions.data.items
    .filter((s) => filter === 'all' || s.status === filter)
    // Upcoming first (soonest at the top), then the past, most recent first.
    .sort((a, b) => {
      const af = a.startsAt > now
      const bf = b.startsAt > now
      if (af !== bf) return af ? -1 : 1
      return af ? a.startsAt.localeCompare(b.startsAt) : b.startsAt.localeCompare(a.startsAt)
    })

  return (
    <>
      {header}
      <fieldset className="flex flex-wrap gap-1.5" aria-label="Filter by state">
        {FILTERS.map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? 'default' : 'outline'}
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : STATUS_LABEL[f]}
            <span className="tabular-nums opacity-70">
              {f === 'all' ? sessions.data.items.length : (counts.get(f) ?? 0)}
            </span>
          </Button>
        ))}
      </fieldset>
      {sessions.data.items.length === 0 ? (
        <EmptyState
          icon={CalendarPlus}
          title="You have no sessions yet"
          description="Create your first session and publish it to the eligible catalogue."
          action={
            <Button asChild>
              <Link to="/trainer/sessions/new">Create session</Link>
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/60">
          <EmptyState
            icon={CalendarX2}
            title={`No ${STATUS_LABEL[filter as SessionStatus].toLowerCase()} sessions`}
            description="Choose another state to see more sessions."
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((s) => (
            <Reveal key={s.id}>
              <TrainerSessionCard session={s} />
            </Reveal>
          ))}
        </div>
      )}
    </>
  )
}
