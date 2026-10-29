import { useQuery } from '@tanstack/react-query'
import { Check, Inbox, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ApiError } from '@/lib/api-error'
import { qatarDateTime } from '@/lib/format/qatar-time'
import { Panel } from '../../hub/components/Panel'
import { ErrorPanel, TableSkeleton } from '../../hub/components/QueryStates'
import { StatusPill } from '../../hub/components/StatusPill'
import {
  type ChangeRequest,
  changeRequestsQuery,
  useDecideChangeRequest,
} from '../queries/sessions.queries'
import { DecisionDialog } from './DecisionDialog'

const KIND = { cancel: 'Cancel booking', reschedule: 'Move to another session' }

/**
 * Late change requests (brief §6): inside 24 hours a learner cannot change a booking
 * themselves, so the request comes here. Approving releases the seat; declining keeps it.
 * Both are audited and the learner is notified.
 */
export function ChangeRequestsPanel() {
  const query = useQuery(changeRequestsQuery())
  const decide = useDecideChangeRequest()
  const [pending, setPending] = useState<{
    request: ChangeRequest
    decision: 'approved' | 'declined'
  } | null>(null)
  const items = query.data?.items ?? []
  const open = items.filter((i) => !i.decision).length

  return (
    <Panel
      bodyClassName="p-0"
      title="Late change requests"
      description="Requests to cancel or move a booking inside 24 hours of the session. Decisions are audited and the learner is notified."
      action={
        open ? <StatusPill tone="warn">{`${open} awaiting a decision`}</StatusPill> : undefined
      }
    >
      {query.isPending ? (
        <TableSkeleton rows={2} cols={3} />
      ) : query.isError ? (
        <ErrorPanel error={query.error} onRetry={() => query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No late change requests"
          description="Learners change their own bookings until 24 hours before a session. Requests made after that appear here."
        />
      ) : (
        <ul className="divide-y" aria-label="Late change requests">
          {items.map((r) => (
            <li
              key={r.rsvpId}
              className="flex flex-col gap-3 px-6 py-4 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="grid gap-1">
                <p className="font-medium text-ink">
                  {r.learner.code} {r.learner.name}: {KIND[r.kind]}
                </p>
                <p className="text-muted-foreground text-sm">
                  {r.session.code} {r.session.title}, {qatarDateTime(r.session.startsAt)}
                </p>
                {r.reason ? <p className="text-sm text-ink/80">Reason: {r.reason}</p> : null}
                <p className="text-muted-foreground text-xs">
                  Requested {qatarDateTime(r.requestedAt)}
                </p>
              </div>
              {r.decision ? (
                <StatusPill tone={r.decision.outcome === 'approved' ? 'good' : 'neutral'}>
                  {`${r.decision.outcome === 'approved' ? 'Approved' : 'Declined'} ${qatarDateTime(r.decision.at, { year: false, label: false })}`}
                </StatusPill>
              ) : (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => setPending({ request: r, decision: 'approved' })}
                    aria-label={`Approve request from ${r.learner.code}`}
                  >
                    <Check aria-hidden /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPending({ request: r, decision: 'declined' })}
                    aria-label={`Decline request from ${r.learner.code}`}
                  >
                    <X aria-hidden /> Decline
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <DecisionDialog
        request={pending?.request ?? null}
        decision={pending?.decision ?? 'approved'}
        pending={decide.isPending}
        onOpenChange={(next) => (next ? null : setPending(null))}
        onConfirm={(note) => {
          if (!pending) return
          decide.mutate(
            { rsvpId: pending.request.rsvpId, decision: pending.decision, note },
            {
              onSuccess: () => {
                toast.success(
                  pending.decision === 'approved'
                    ? 'Request approved. The seat is released and the learner has been notified.'
                    : 'Request declined. The booking stays and the learner has been notified.',
                )
                setPending(null)
              },
              onError: (error) =>
                toast.error(
                  error instanceof ApiError ? error.message : 'The decision could not be saved.',
                ),
            },
          )
        }}
      />
    </Panel>
  )
}
