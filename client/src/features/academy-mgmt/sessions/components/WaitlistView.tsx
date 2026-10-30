import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Hourglass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ErrorPanel, TableSkeleton } from '../../hub/components/QueryStates'
import { StatusPill } from '../../hub/components/StatusPill'
import { TableFrame } from '../../hub/components/TableFrame'
import { qDateTime } from '../../hub/utils/format'
import { waitlistQuery } from '../queries/sessions.queries'

/**
 * Waitlisted learners across upcoming sessions: the list the dashboard's Waitlisted learners
 * count opens (`?view=waitlist`). Offered learners hold a reserved seat and are included.
 */
export function WaitlistView() {
  const query = useQuery(waitlistQuery())
  const items = query.data?.items ?? []

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-6 py-4">
        <div className="grid gap-0.5">
          <h2 className="font-display text-xl font-normal text-ink">Waitlisted learners</h2>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {query.data
              ? `${query.data.learners} ${query.data.learners === 1 ? 'learner' : 'learners'} across ${items.length} ${items.length === 1 ? 'place' : 'places'}. Open a session to change the order.`
              : 'Loading'}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/admin/manage/sessions" search={{}}>
            Show all sessions
          </Link>
        </Button>
      </div>
      {query.isPending ? (
        <TableSkeleton cols={5} />
      ) : query.isError ? (
        <div className="p-6">
          <ErrorPanel error={query.error} onRetry={() => query.refetch()} />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Hourglass}
          title="Nobody is on a waitlist"
          description="Learners appear here when they join the waitlist for a full session."
        />
      ) : (
        <TableFrame label="Waitlisted learners">
          <Table>
            <TableHeader>
              <TableRow className="bg-sand/60 hover:bg-sand/60">
                <TableHead className="ps-6">Learner</TableHead>
                <TableHead>Session</TableHead>
                <TableHead>Qatar time</TableHead>
                <TableHead>Place</TableHead>
                <TableHead className="pe-6">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((e) => (
                <TableRow key={e.rsvpId}>
                  <TableCell className="ps-6 text-sm">
                    <span className="block font-medium text-ink">{e.name}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {e.learnerDisplayId}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="block">{e.sessionTitle}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {e.sessionCode}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">{qDateTime(e.startsAt)}</TableCell>
                  <TableCell className="text-sm tabular-nums">{e.position ?? 'Offer'}</TableCell>
                  <TableCell className="pe-6">
                    {e.status === 'offered' ? (
                      <StatusPill tone="warn">
                        Seat offered
                        {e.offerExpiresAt ? ` until ${qDateTime(e.offerExpiresAt)}` : ''}
                      </StatusPill>
                    ) : (
                      <StatusPill tone="info">Waitlisted</StatusPill>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableFrame>
      )}
    </section>
  )
}
