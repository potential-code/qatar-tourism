import { ChevronDown, Mail, Smartphone } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { qatarDateTime } from '@/features/sessions/utils/qatar-time'
import type { LogRow } from '../types'
import { DeliveryStateBadge } from './DeliveryStateBadge'

const KIND_LABEL: Record<string, string> = {
  session_rescheduled: 'Session rescheduled',
  session_cancelled: 'Session cancelled',
  session_waitlist_update: 'Waitlist update',
  waitlist_promoted: 'Waitlist seat confirmed',
}

/** One event (one event ID) and every message it produced, per learner and channel. */
export function NotificationEventCard({
  eventId,
  rows,
  defaultOpen,
}: {
  eventId: string
  rows: LogRow[]
  defaultOpen?: boolean
}) {
  const first = rows[0] as LogRow
  const learners = new Set(rows.map((r) => r.learnerCode)).size
  const emails = rows.filter((r) => r.channel === 'email').length
  const inApp = rows.length - emails
  return (
    <Collapsible defaultOpen={defaultOpen} className="rounded-xl border bg-card shadow-xs">
      <CollapsibleTrigger className="group flex w-full flex-col gap-2 p-4 text-start sm:flex-row sm:items-center sm:gap-4 md:p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-maroon/20 text-maroon-deep">
              {KIND_LABEL[first.kind] ?? first.kind}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {first.sessionCode}, {qatarDateTime(first.createdAt)}
            </span>
          </div>
          <p className="mt-1 font-medium text-ink">{first.sessionTitle}</p>
          <p className="truncate text-xs text-muted-foreground">Event {eventId}</p>
        </div>
        <div className="flex items-center gap-4 text-sm text-ink-soft">
          <span>{learners} learners</span>
          <span className="inline-flex items-center gap-1">
            <Smartphone aria-hidden className="size-4" /> {inApp}
          </span>
          <span className="inline-flex items-center gap-1">
            <Mail aria-hidden className="size-4" /> {emails}
          </span>
          <ChevronDown
            aria-hidden
            className="size-4 transition-transform group-data-[state=open]:rotate-180"
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t px-4 py-3 md:px-5">
          <p className="text-xs text-muted-foreground">
            Example message. Each learner receives it with their own name.
          </p>
          <p className="mt-1 text-sm font-medium text-ink">{first.subject}</p>
          <p className="mt-1 text-sm text-ink-soft">{first.body}</p>
        </div>
        <section className="overflow-x-auto border-t" aria-label={`Messages for event ${eventId}`}>
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-sand text-xs text-muted-foreground">
              <tr>
                {['Learner ID', 'Display name', 'Channel', 'Delivery state', 'Read'].map((h) => (
                  <th key={h} scope="col" className="px-4 py-2 text-start font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {[...rows]
                .sort(
                  (a, b) =>
                    a.learnerCode.localeCompare(b.learnerCode) ||
                    b.channel.localeCompare(a.channel),
                )
                .map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2 font-medium tabular-nums">{r.learnerCode}</td>
                    <td className="px-4 py-2">{r.recipientName}</td>
                    <td className="px-4 py-2">{r.channel === 'email' ? 'Demo email' : 'In-app'}</td>
                    <td className="px-4 py-2">
                      <DeliveryStateBadge state={r.state} channel={r.channel} />
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {r.channel === 'in_app' ? (r.readAt ? 'Read' : 'Unread') : 'Not applicable'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      </CollapsibleContent>
    </Collapsible>
  )
}
