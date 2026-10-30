import { useQuery } from '@tanstack/react-query'
import { Eye, GitMerge, Link2, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { CrmEventView } from '@/services/crm/views'
import { retryCrmEvent } from '@/services/crm.service'
import { OptionSelect } from '../../../hub/components/OptionSelect'
import { Panel } from '../../../hub/components/Panel'
import { ErrorPanel, TableSkeleton } from '../../../hub/components/QueryStates'
import { TableFrame } from '../../../hub/components/TableFrame'
import { qDateTime } from '../../../hub/utils/format'
import { crmEventsQuery, useIntegrationMutation } from '../../queries/integrations.queries'
import { EventDetailDialog } from './EventDetailDialog'
import { IdentityReview } from './IdentityReview'
import { ReconcileDialog } from './ReconcileDialog'
import { ResolveMappingDialog } from './ResolveMappingDialog'
import { DirectionLabel, EventStatusPill, TYPE_LABEL } from './status'

const FILTERS = [
  { value: 'processed', label: 'Processed' },
  { value: 'queued', label: 'Queued' },
  { value: 'failed', label: 'Failed' },
  { value: 'conflict', label: 'Conflict' },
]

/** Sync Log: every event, with View details, Retry, Resolve mapping and Reconcile. */
export function SyncLogPane() {
  const query = useQuery(crmEventsQuery())
  const [status, setStatus] = useState<string | null>(null)
  const [detail, setDetail] = useState<CrmEventView | null>(null)
  const [resolve, setResolve] = useState<CrmEventView | null>(null)
  const [reconcile, setReconcile] = useState<CrmEventView | null>(null)
  const retry = useIntegrationMutation(retryCrmEvent, (r) => `${r.eventId}: ${r.message}`)
  const rows = (query.data ?? []).filter((e) => !status || e.status === status)

  return (
    <div className="grid gap-6">
      <Panel
        title="Sync log"
        description="Retrying an event never creates another learner, enrolment or certificate."
        action={
          <OptionSelect
            ariaLabel="Filter by status"
            value={status}
            onChange={setStatus}
            allowNone
            noneLabel="All statuses"
            options={FILTERS}
            className="h-9 w-44 rounded-lg bg-white"
          />
        }
        bodyClassName="p-0"
      >
        {query.isPending ? (
          <TableSkeleton rows={5} cols={7} />
        ) : query.isError ? (
          <ErrorPanel error={query.error} onRetry={() => query.refetch()} />
        ) : (
          <TableFrame label="Sync log">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Event ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((e) => (
                  <TableRow key={e.eventId}>
                    <TableCell className="whitespace-nowrap">{qDateTime(e.occurredAt)}</TableCell>
                    <TableCell>
                      <DirectionLabel source={e.source} destination={e.destination} />
                    </TableCell>
                    <TableCell>
                      {TYPE_LABEL[e.type]}
                      <span className="block text-xs text-muted-foreground">
                        {e.learnerDisplayId ?? e.externalLearnerId}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{e.eventId}</TableCell>
                    <TableCell>
                      <EventStatusPill status={e.status} />
                    </TableCell>
                    <TableCell>{e.attempts}</TableCell>
                    <TableCell className="max-w-sm whitespace-normal text-muted-foreground">
                      {e.error ?? ''}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => setDetail(e)}
                          aria-label={`View details of ${e.eventId}`}
                        >
                          <Eye /> View details
                        </Button>
                        {e.unmappedCode ? (
                          <Button
                            size="xs"
                            onClick={() => setResolve(e)}
                            aria-label={`Resolve mapping for ${e.eventId}`}
                          >
                            <Link2 /> Resolve mapping
                          </Button>
                        ) : null}
                        {e.status === 'conflict' && !e.identityReview ? (
                          <Button
                            size="xs"
                            onClick={() => setReconcile(e)}
                            aria-label={`Reconcile ${e.eventId}`}
                          >
                            <GitMerge /> Reconcile
                          </Button>
                        ) : null}
                        {e.canRetry &&
                        !e.unmappedCode &&
                        !e.identityReview &&
                        e.status !== 'conflict' ? (
                          <Button
                            size="xs"
                            variant="outline"
                            disabled={retry.isPending}
                            onClick={() => retry.mutate(e.eventId)}
                            aria-label={`Retry ${e.eventId}`}
                          >
                            <RotateCcw /> Retry
                          </Button>
                        ) : null}
                        {e.unmappedCode ? (
                          <Button
                            size="xs"
                            variant="ghost"
                            disabled={retry.isPending}
                            onClick={() => retry.mutate(e.eventId)}
                            aria-label={`Retry ${e.eventId}`}
                          >
                            <RotateCcw /> Retry
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      No events match this filter.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableFrame>
        )}
      </Panel>
      <IdentityReview />
      <EventDetailDialog event={detail} onClose={() => setDetail(null)} />
      <ResolveMappingDialog
        eventId={resolve?.eventId ?? null}
        crmCode={resolve?.unmappedCode ?? ''}
        onClose={() => setResolve(null)}
      />
      <ReconcileDialog event={reconcile} onClose={() => setReconcile(null)} />
    </div>
  )
}
