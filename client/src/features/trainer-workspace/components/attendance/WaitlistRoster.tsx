import { learnerDisplayId } from '@shared/utils/identity'
import { Hourglass } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { qatarDateTime } from '@/lib/format/qatar-time'
import type { RosterRow } from '../../types'

/**
 * Offered and waitlisted learners for one session (SPEC §5). A separate list from the Confirmed
 * roster: these learners are not booked, have no attendance control and are never counted as
 * attending. Trainers see the queue read-only; only an administrator can change priority.
 */
export function WaitlistRoster({ rows }: { rows: RosterRow[] }) {
  const offered = rows.filter((r) => r.rsvpStatus === 'offered')
  const waiting = rows
    .filter((r) => r.rsvpStatus === 'waitlisted')
    .sort((a, b) => (a.waitlistPosition ?? 0) - (b.waitlistPosition ?? 0))
  const ordered = [...offered, ...waiting]

  return (
    <section aria-labelledby="waitlist-heading" className="grid gap-3">
      <div className="grid gap-1">
        <h2 id="waitlist-heading" className="font-display text-xl font-normal text-ink">
          Waitlist roster ({ordered.length})
        </h2>
        <p className="text-sm text-muted-foreground">
          Not booked and not attending. Offered learners hold a reserved seat until their offer
          ends. Only administrators can change the queue order.
        </p>
      </div>
      {ordered.length === 0 ? (
        <p className="flex items-center gap-2 rounded-xl border border-dashed bg-card/60 px-4 py-3 text-sm text-muted-foreground">
          <Hourglass aria-hidden className="size-4" /> Nobody is waiting for this session.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
          <table className="w-full min-w-[560px] text-sm">
            <caption className="sr-only">Offered and waitlisted learners</caption>
            <thead className="bg-sand text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 text-start font-medium">
                  Learner ID
                </th>
                <th scope="col" className="px-4 py-3 text-start font-medium">
                  Display name
                </th>
                <th scope="col" className="px-4 py-3 text-start font-medium">
                  Place
                </th>
                <th scope="col" className="px-4 py-3 text-start font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ordered.map((row) => (
                <tr key={row.rsvpId}>
                  <td className="px-4 py-3 font-medium tabular-nums">
                    {learnerDisplayId(row.learnerCode)}
                  </td>
                  <td className="px-4 py-3">{row.displayName}</td>
                  <td className="px-4 py-3 tabular-nums">{row.waitlistPosition ?? 'Offer'}</td>
                  <td className="px-4 py-3">
                    {row.rsvpStatus === 'offered' ? (
                      <Badge variant="outline" className="border-warning/30 text-warning">
                        Seat offered
                        {row.offerExpiresAt ? `, until ${qatarDateTime(row.offerExpiresAt)}` : ''}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Waitlisted</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
