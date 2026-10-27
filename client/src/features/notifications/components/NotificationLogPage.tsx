import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { BellOff, Mail, Send, Smartphone, X } from 'lucide-react'
import { StatCard } from '@/components/data/StatCard'
import { PageHeader } from '@/components/layout/PageHeader'
import { SimulatedTag } from '@/components/layout/SimulatedTag'
import { Reveal } from '@/components/motion/Reveal'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryErrorPanel } from '@/features/sessions/components/QueryErrorPanel'
import { type LogFilter, notificationLogQuery } from '../queries/notifications.queries'
import type { LogRow } from '../types'
import { NotificationEventCard } from './NotificationEventCard'

/**
 * Notification log (brief §11): every in-app message and demo email the trainer's session
 * changes produced, with delivery state. Emails are simulated; none is described as delivered.
 */
export function NotificationLogPage({ filter }: { filter: LogFilter }) {
  const log = useQuery(notificationLogQuery(filter))
  const header = (
    <PageHeader
      title="Notification log"
      breadcrumbs={[
        { label: 'My sessions', to: '/trainer/sessions' },
        { label: 'Notification log' },
      ]}
      description="In-app notifications and demo emails created by session changes, with their delivery state."
    />
  )
  const chips = (
    <div className="flex flex-wrap items-center gap-2">
      <SimulatedTag label="Demo emails have been generated in the notification log; no external emails were sent." />
      {filter.eventId ? (
        <Button asChild size="xs" variant="outline">
          <Link to="/trainer/sessions/notification-log" search={{ sessionId: filter.sessionId }}>
            Event {filter.eventId} <X aria-label="Clear event filter" />
          </Link>
        </Button>
      ) : null}
      {filter.sessionId ? (
        <Button asChild size="xs" variant="outline">
          <Link to="/trainer/sessions/notification-log" search={{ eventId: filter.eventId }}>
            One session only <X aria-label="Clear session filter" />
          </Link>
        </Button>
      ) : null}
    </div>
  )
  if (log.isPending) {
    return (
      <>
        {header}
        {chips}
        <div className="grid gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </>
    )
  }
  if (log.isError)
    return (
      <>
        {header}
        <QueryErrorPanel error={log.error} onRetry={() => log.refetch()} />
      </>
    )

  const groups = new Map<string, LogRow[]>()
  for (const row of log.data.items)
    groups.set(row.eventId, [...(groups.get(row.eventId) ?? []), row])
  const emails = log.data.items.filter((r) => r.channel === 'email').length

  return (
    <>
      {header}
      {chips}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Events" value={groups.size} icon={Send} />
        <StatCard
          label="In-app notifications"
          value={log.data.items.length - emails}
          icon={Smartphone}
          tone="maroon"
        />
        <StatCard
          label="Demo emails, simulated"
          value={emails}
          icon={Mail}
          tone="neutral"
          description="Not sent to any inbox"
        />
      </div>
      {groups.size === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/60">
          <EmptyState
            icon={BellOff}
            title="No notifications yet"
            description="Reschedule or cancel a session and the messages it creates appear here."
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {[...groups.entries()].map(([eventId, rows], i) => (
            <Reveal key={eventId}>
              <NotificationEventCard
                eventId={eventId}
                rows={rows}
                defaultOpen={Boolean(filter.eventId) || i === 0}
              />
            </Reveal>
          ))}
        </div>
      )}
    </>
  )
}
