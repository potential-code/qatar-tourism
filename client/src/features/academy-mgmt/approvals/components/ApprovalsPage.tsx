import type { ApprovalStatus, ApprovalType } from '@shared/constants'
import { useQuery } from '@tanstack/react-query'
import { ClipboardCheck, FileText } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
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
import { ApiError } from '@/lib/api-error'
import { ManagePage } from '../../hub/components/ManagePage'
import { OptionSelect } from '../../hub/components/OptionSelect'
import { ErrorPanel, TableSkeleton } from '../../hub/components/QueryStates'
import { ReasonDialog } from '../../hub/components/ReasonDialog'
import { StatusPill, type Tone } from '../../hub/components/StatusPill'
import { TableFrame } from '../../hub/components/TableFrame'
import { qDateTime } from '../../hub/utils/format'
import { type ApprovalRow, approvalsQuery, useDecideApproval } from '../queries/approvals.queries'
import { ApproveDialog } from './ApproveDialog'

export type ApprovalsSearch = { status?: ApprovalStatus; type?: ApprovalType }

const STATUS: Record<ApprovalStatus, { label: string; tone: Tone }> = {
  pending: { label: 'Pending review', tone: 'warn' },
  approved: { label: 'Approved', tone: 'good' },
  rejected: { label: 'Rejected', tone: 'bad' },
  info_requested: { label: 'Information requested', tone: 'info' },
}

const TYPE: Record<ApprovalType, string> = {
  enrolment: 'Programme enrolment',
  external_certificate: 'External certificate',
}

type Action = { kind: 'approve' | 'reject' | 'request_info'; request: ApprovalRow }

const optionsOf = (map: Record<string, string>) =>
  Object.entries(map).map(([value, label]) => ({ value, label }))

/**
 * Enrolments and Approvals (SPEC §5). Two distinct request types. Approve, Reject (reason
 * required) or Request information; every decision is audited with reviewer, time and reason and
 * the learner sees the result straight away. The dashboard's Pending approvals count opens this
 * page filtered to `status=pending`.
 */
export function ApprovalsPage({
  search,
  onSearch,
}: {
  search: ApprovalsSearch
  onSearch: (next: ApprovalsSearch) => void
}) {
  const query = useQuery(approvalsQuery(search))
  const decide = useDecideApproval()
  const [action, setAction] = useState<Action | null>(null)
  const rows = query.data?.items ?? []

  async function submit(
    kind: Action['kind'],
    request: ApprovalRow,
    input: { reason?: string; recognisedAmount?: number },
  ) {
    try {
      const result = await decide.mutateAsync({ requestId: request.id, decision: kind, ...input })
      const booking =
        result.booking === 'waitlisted'
          ? ' The session is full, so the learner joined its waitlist.'
          : result.booking === 'confirmed'
            ? ' The learner has a confirmed seat.'
            : result.booking === 'not_booked'
              ? ` No seat was booked: ${result.note ?? 'the session is not open to this learner yet'}`
              : ''
      toast.success(
        kind === 'approve'
          ? `${request.code} approved.${booking}`
          : kind === 'reject'
            ? `${request.code} rejected. The learner sees your reason.`
            : `Information requested for ${request.code}.`,
        {
          description: 'Audit event recorded; demo email and in-app notification added to the log.',
        },
      )
      setAction(null)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'The decision could not be saved.')
    }
  }

  return (
    <ManagePage
      title="Enrolments and Approvals"
      description="Programme enrolment and external-certificate requests waiting for a decision. Approval never bypasses session capacity."
    >
      <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <div className="flex flex-wrap items-center gap-3 border-b border-border/70 px-6 py-4">
          <OptionSelect
            ariaLabel="Status"
            className="h-10 w-52 rounded-lg bg-white"
            value={search.status}
            onChange={(v) => onSearch({ ...search, status: (v ?? undefined) as ApprovalStatus })}
            options={optionsOf(
              Object.fromEntries(Object.entries(STATUS).map(([k, s]) => [k, s.label])),
            )}
            allowNone
            noneLabel="All statuses"
          />
          <OptionSelect
            ariaLabel="Request type"
            className="h-10 w-52 rounded-lg bg-white"
            value={search.type}
            onChange={(v) => onSearch({ ...search, type: (v ?? undefined) as ApprovalType })}
            options={optionsOf(TYPE)}
            allowNone
            noneLabel="All request types"
          />
          {search.status || search.type ? (
            <Button variant="ghost" onClick={() => onSearch({})}>
              Reset filters
            </Button>
          ) : null}
          <p className="ms-auto text-sm text-muted-foreground tabular-nums" aria-live="polite">
            {rows.length} {rows.length === 1 ? 'request' : 'requests'}
          </p>
        </div>
        {query.isPending ? (
          <TableSkeleton cols={8} />
        ) : query.isError ? (
          <div className="p-6">
            <ErrorPanel error={query.error} onRetry={() => query.refetch()} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="No requests match"
            description="Nothing is waiting with these filters. Reset them to see every request."
          />
        ) : (
          <TableFrame label="Approval requests">
            <Table>
              <TableHeader>
                <TableRow className="bg-sand/60 hover:bg-sand/60">
                  <TableHead className="ps-6">Request ID</TableHead>
                  <TableHead>Learner</TableHead>
                  <TableHead>Programme or credential</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Evidence</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pe-6 text-end">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="ps-6 font-medium tabular-nums">
                      {r.code}
                      <span className="block text-xs font-normal text-muted-foreground">
                        {TYPE[r.type]}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="block font-medium text-ink">{r.learner.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {r.learner.displayId}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-56 text-sm">{r.target}</TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {qDateTime(r.submittedAt)}
                    </TableCell>
                    <TableCell className="text-sm">{r.reviewer ?? 'Unassigned'}</TableCell>
                    <TableCell className="max-w-64 text-sm text-ink-soft">
                      {r.evidence.note}
                      {r.evidence.fileName ? (
                        <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <FileText aria-hidden className="size-3" /> {r.evidence.fileName}
                        </span>
                      ) : null}
                      {r.reason ? (
                        <span className="mt-1 block text-xs">Reason: {r.reason}</span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <StatusPill tone={STATUS[r.status].tone}>{STATUS[r.status].label}</StatusPill>
                      {r.decidedAt ? (
                        <span className="mt-1 block text-xs text-muted-foreground tabular-nums">
                          {qDateTime(r.decidedAt)}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="pe-6 text-end">
                      {r.status === 'pending' || r.status === 'info_requested' ? (
                        <span className="flex flex-wrap justify-end gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => setAction({ kind: 'approve', request: r })}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setAction({ kind: 'reject', request: r })}
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setAction({ kind: 'request_info', request: r })}
                          >
                            Request information
                          </Button>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Decided</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableFrame>
        )}
      </section>

      <ApproveDialog
        request={action?.kind === 'approve' ? action.request : null}
        pending={decide.isPending}
        onCancel={() => setAction(null)}
        onConfirm={(input) => action && submit('approve', action.request, input)}
      />
      <ReasonDialog
        open={action?.kind === 'reject'}
        onOpenChange={(open) => !open && setAction(null)}
        title={`Reject ${action?.request.code ?? 'request'}`}
        description="The learner sees this reason and the next step. A reason is required."
        confirmLabel="Reject request"
        destructive
        pending={decide.isPending}
        onConfirm={(reason) => action && submit('reject', action.request, { reason })}
      />
      <ReasonDialog
        open={action?.kind === 'request_info'}
        onOpenChange={(open) => !open && setAction(null)}
        title={`Request information for ${action?.request.code ?? 'request'}`}
        description="Say what the learner needs to add. The request stays open and they can reply."
        confirmLabel="Send request"
        pending={decide.isPending}
        onConfirm={(reason) => action && submit('request_info', action.request, { reason })}
      />
    </ManagePage>
  )
}
