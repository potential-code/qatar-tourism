import { useEffect, useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { Field } from '../../hub/components/Field'
import type { ApprovalRow } from '../queries/approvals.queries'

/**
 * Approve a request. The note is optional but is stored with the audit event. For an external
 * certificate the reviewer also confirms the amount of CPD recognised (it can differ from the
 * claim).
 */
export function ApproveDialog({
  request,
  pending,
  onCancel,
  onConfirm,
}: {
  request: ApprovalRow | null
  pending: boolean
  onCancel: () => void
  onConfirm: (input: { reason?: string; recognisedAmount?: number }) => void
}) {
  const [note, setNote] = useState('')
  const [amount, setAmount] = useState('')
  useEffect(() => {
    if (request) {
      setNote('')
      setAmount(request.claimedAmount ? String(request.claimedAmount) : '')
    }
  }, [request])
  const certificate = request?.type === 'external_certificate'
  const parsed = Number(amount)
  const invalid = certificate && (!Number.isFinite(parsed) || parsed <= 0)

  return (
    <Dialog open={Boolean(request)} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal">
            Approve {request?.code}
          </DialogTitle>
          <DialogDescription>
            {certificate
              ? 'Confirm the evidence and the CPD recognised. The learner is told, and the decision is audited with your name and the time.'
              : 'The learner is enrolled in the programme. If the request names a session, approval does not bypass capacity: a full session puts the learner on its waitlist.'}
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            if (invalid) return
            onConfirm({
              reason: note.trim() || undefined,
              recognisedAmount: certificate ? parsed : undefined,
            })
          }}
        >
          {certificate ? (
            <Field
              id="recognised-amount"
              label={`Recognised CPD (${request?.unit ?? 'hours'}), claimed ${request?.claimedAmount ?? ''}`}
              error={invalid ? 'Enter an amount above zero' : null}
            >
              <Input
                id="recognised-amount"
                type="number"
                min="0"
                step="0.5"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-10 rounded-lg"
              />
            </Field>
          ) : null}
          <Field id="approve-note" label="Note (optional, recorded in the audit trail)">
            <Textarea
              id="approve-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="rounded-lg"
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || invalid}>
              {pending ? 'Saving' : 'Approve'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
