import { AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useMarkingFields } from '../hooks/useMarkingFields'
import { useCorrect } from '../queries/marking.queries'
import type { MarkingDetail } from '../types'
import { ActionDialog } from './ActionDialog'
import { DecisionPicker } from './DecisionPicker'
import { RubricScorer } from './RubricScorer'
import { TotalReadout } from './TotalReadout'

interface CorrectionDialogProps {
  detail: MarkingDetail
  review: NonNullable<NonNullable<MarkingDetail['current']>['review']>
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Correcting a final mark: needs a reason, which goes to the audit log (brief §10). */
export function CorrectionDialog({ detail, review, open, onOpenChange }: CorrectionDialogProps) {
  const fields = useMarkingFields(detail.assignment.rubric, {
    breakdown: review.breakdown ?? {},
    feedback: review.feedback,
    decision: review.status as 'returned' | 'approved',
  })
  const [reason, setReason] = useState('')
  const correct = useCorrect(detail.id)
  const reasonOk = reason.trim().length >= 10

  const submit = () => {
    if (!fields.decision || !reasonOk) return
    correct.mutate(
      {
        breakdown: fields.breakdown,
        feedback: fields.feedback.trim(),
        decision: fields.decision,
        reason: reason.trim(),
      },
      {
        onSuccess: (result) => {
          onOpenChange(false)
          toast.success(result.unchanged ? 'Nothing changed' : 'Mark corrected', {
            description: result.unchanged
              ? 'The mark already had these values.'
              : 'The change and your reason are in the audit log. The learner has been notified.',
          })
        },
      },
    )
  }

  return (
    <ActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Correct a final mark"
      description="Changes to a finalised mark need a reason. The before and after values and your reason are recorded in the audit log."
      confirmLabel="Save correction"
      onConfirm={submit}
      pending={correct.isPending}
    >
      <div className="grid max-h-[55dvh] gap-4 overflow-y-auto pe-1">
        <TotalReadout total={fields.total} passPercent={detail.assignment.passPercent} />
        <RubricScorer
          rubric={detail.assignment.rubric}
          breakdown={fields.breakdown}
          onChange={fields.setPart}
        />
        <div className="grid gap-2">
          <Label htmlFor="correction-feedback">Feedback</Label>
          <Textarea
            id="correction-feedback"
            rows={3}
            value={fields.feedback}
            onChange={(event) => fields.setFeedback(event.target.value)}
          />
        </div>
        {detail.isLatest ? (
          <DecisionPicker
            value={fields.decision}
            onChange={fields.setDecision}
            total={fields.total}
            passPercent={detail.assignment.passPercent}
          />
        ) : null}
        <div className="grid gap-2">
          <Label htmlFor="correction-reason">Reason for the correction (required)</Label>
          <Textarea
            id="correction-reason"
            rows={2}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            aria-invalid={reason.length > 0 && !reasonOk}
            placeholder="For example: the follow-up section was under-marked."
          />
          {reason.length > 0 && !reasonOk ? (
            <p className="text-xs text-destructive">Give a reason of at least 10 characters.</p>
          ) : null}
        </div>
        {correct.isError ? (
          <Alert variant="destructive">
            <AlertCircle aria-hidden />
            <AlertDescription>{correct.error.message}</AlertDescription>
          </Alert>
        ) : null}
      </div>
    </ActionDialog>
  )
}
