import { useQuery } from '@tanstack/react-query'
import { FileText } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useDownloadEvidence } from '@/features/learner-record/queries/record.queries'
import { ApiError } from '@/lib/api-error'
import type { ExternalCertificateView } from '@/services/external-certificates.service'
import { Field } from '../../hub/components/Field'
import { OptionSelect } from '../../hub/components/OptionSelect'
import { Panel } from '../../hub/components/Panel'
import { ErrorPanel, TableSkeleton } from '../../hub/components/QueryStates'
import { StatusPill, type Tone } from '../../hub/components/StatusPill'
import { qDate, qDateTime } from '../../hub/utils/format'
import { reviewsQuery, useReviewExternal } from '../queries/certificates-admin.queries'

const STATUS: Record<ExternalCertificateView['status'], { label: string; tone: Tone }> = {
  pending: { label: 'Pending review', tone: 'warn' },
  verified: { label: 'Verified', tone: 'good' },
  rejected: { label: 'Rejected', tone: 'bad' },
  info_requested: { label: 'Information requested', tone: 'info' },
}

type Action = 'approve' | 'reject' | 'request_info'

/**
 * External reviews: approve with the recognised amount, reject with a reason, or request
 * information. Reviewer and time are recorded; the same certificate is never credited twice.
 */
export function ExternalReviewsTab() {
  const [status, setStatus] = useState('all')
  const query = useQuery(reviewsQuery(status))
  const evidence = useDownloadEvidence()
  const [target, setTarget] = useState<{ item: ExternalCertificateView; action: Action } | null>(
    null,
  )

  if (query.isError) return <ErrorPanel error={query.error} onRetry={() => void query.refetch()} />
  const rows = query.data?.items ?? []

  return (
    <Panel
      title="External reviews"
      description="Certificates learners earned elsewhere. They stay Pending review and add no approved CPD until recognised here. External evidence is never an Academy credential."
      bodyClassName="grid gap-4 p-0"
    >
      <div className="grid gap-1.5 px-6 pt-5">
        <label htmlFor="review-status" className="text-sm font-medium">
          Status
        </label>
        <OptionSelect
          id="review-status"
          value={status}
          onChange={(v) => setStatus(v ?? 'all')}
          className="h-10 w-56 rounded-lg bg-white"
          options={[
            { value: 'all', label: 'All reviews' },
            { value: 'pending', label: 'Pending review' },
            { value: 'info_requested', label: 'Information requested' },
            { value: 'verified', label: 'Verified' },
            { value: 'rejected', label: 'Rejected' },
          ]}
        />
      </div>
      {query.isPending ? (
        <TableSkeleton cols={6} rows={4} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request</TableHead>
              <TableHead>Learner</TableHead>
              <TableHead>Certificate</TableHead>
              <TableHead>Claimed</TableHead>
              <TableHead>Decision</TableHead>
              <TableHead className="text-end">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No external certificates match this status.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {item.requestCode ?? '—'}
                    <span className="block text-xs font-normal text-muted-foreground">
                      {qDate(item.submittedAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {item.learnerName}
                    <span className="block text-xs text-muted-foreground">
                      {item.learnerDisplayId}
                    </span>
                  </TableCell>
                  <TableCell className="min-w-56">
                    {item.title}
                    <span className="block text-xs text-muted-foreground">
                      {item.issuer} · {item.externalRef}
                    </span>
                    {item.alreadyRecognised && item.status === 'pending' ? (
                      <span className="block text-xs font-medium text-destructive">
                        Already recognised once: cannot be credited twice
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {item.claimedAmount} {item.unit}
                  </TableCell>
                  <TableCell className="min-w-48">
                    <StatusPill tone={STATUS[item.status].tone}>
                      {STATUS[item.status].label}
                    </StatusPill>
                    {item.status !== 'pending' ? (
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {item.recognisedAmount !== null
                          ? `${item.recognisedAmount} ${item.unit} recognised · `
                          : ''}
                        {item.reviewerName ?? 'Reviewer'}, {qDateTime(item.reviewedAt)}
                        {item.reason ? ` · ${item.reason}` : ''}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={evidence.isPending}
                        onClick={() =>
                          evidence.mutate(item.id, {
                            onError: () => toast.error('The evidence could not be opened'),
                          })
                        }
                      >
                        <FileText aria-hidden /> Evidence
                      </Button>
                      {item.status === 'pending' ? (
                        <>
                          <Button size="sm" onClick={() => setTarget({ item, action: 'approve' })}>
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setTarget({ item, action: 'request_info' })}
                          >
                            Request info
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setTarget({ item, action: 'reject' })}
                          >
                            Reject
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
      <DecisionDialog target={target} onClose={() => setTarget(null)} />
    </Panel>
  )
}

function DecisionDialog({
  target,
  onClose,
}: {
  target: { item: ExternalCertificateView; action: Action } | null
  onClose: () => void
}) {
  const review = useReviewExternal()
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [attempted, setAttempted] = useState(false)
  const [lastId, setLastId] = useState<string | null>(null)

  // Fresh form for each target.
  const key = target ? `${target.item.id}:${target.action}` : null
  if (key !== lastId) {
    setLastId(key)
    setAmount(target ? String(target.item.claimedAmount) : '')
    setReason('')
    setAttempted(false)
  }

  if (!target) return null
  const { item, action } = target
  const needsReason = action !== 'approve'
  const amountNumber = Number(amount)
  const amountError =
    action === 'approve' && !(amountNumber > 0 && amountNumber <= item.claimedAmount)
      ? `Enter an amount above 0 and no more than the ${item.claimedAmount} ${item.unit} claimed`
      : null
  const reasonError =
    needsReason && reason.trim().length < 5 ? 'Give a reason of at least 5 characters' : null

  const title =
    action === 'approve'
      ? 'Approve and recognise CPD'
      : action === 'reject'
        ? 'Reject with a reason'
        : 'Request more information'

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal">{title}</DialogTitle>
          <DialogDescription>
            {item.title} · {item.learnerName} ({item.learnerDisplayId}). Evidence:{' '}
            {item.evidenceFileName ?? 'none'}. The reviewer and time are recorded.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault()
            setAttempted(true)
            if (amountError || reasonError) return
            try {
              await review.mutateAsync({
                id: item.id,
                decision:
                  action === 'approve'
                    ? { action, recognisedAmount: amountNumber }
                    : { action, reason: reason.trim() },
              })
              toast.success(
                action === 'approve'
                  ? `Approved: ${amountNumber} ${item.unit} added to the learner's CPD ledger`
                  : action === 'reject'
                    ? 'Rejected. The learner sees the reason and next step.'
                    : 'Information requested. The certificate stays out of the ledger until answered.',
              )
              onClose()
            } catch (error) {
              toast.error(
                error instanceof ApiError ? error.message : 'The review could not be saved',
              )
            }
          }}
        >
          {action === 'approve' ? (
            <Field
              id="review-amount"
              label={`Recognised amount (${item.unit})`}
              hint={`The learner claimed ${item.claimedAmount} ${item.unit}.`}
              error={attempted ? amountError : null}
            >
              <Input
                id="review-amount"
                type="number"
                step="0.25"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
          ) : (
            <Field
              id="review-reason"
              label={
                action === 'reject'
                  ? 'Reason (shown to the learner)'
                  : 'What is needed (shown to the learner)'
              }
              error={attempted ? reasonError : null}
            >
              <Textarea
                id="review-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="rounded-lg"
              />
            </Field>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={review.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={review.isPending}>
              {review.isPending ? 'Saving' : title.split(' ')[0]}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
