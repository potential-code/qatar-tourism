import { AlertCircle, Save, Send } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { SimulatedTag } from '@/components/layout/SimulatedTag'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { qatarTime } from '@/features/roleplay/utils/format'
import { useMarkingFields } from '../hooks/useMarkingFields'
import { useFinalise, useSaveDraft } from '../queries/marking.queries'
import type { MarkingDetail } from '../types'
import { ActionDialog } from './ActionDialog'
import { DecisionPicker } from './DecisionPicker'
import { RubricScorer } from './RubricScorer'
import { TotalReadout } from './TotalReadout'

/** Rubric marking with a draft and a final step (brief §10). */
export function MarkingForm({ detail }: { detail: MarkingDetail }) {
  const { assignment, draft, learner } = detail
  const fields = useMarkingFields(assignment.rubric, draft ?? {})
  const saveDraft = useSaveDraft(detail.id)
  const finalise = useFinalise(detail.id)
  const [confirming, setConfirming] = useState(false)
  const firstName = learner.displayName.split(' ')[0] || learner.learnerCode

  const feedbackOk = fields.feedback.trim().length >= 10
  const decisionOk =
    fields.decision === 'returned' ||
    (fields.decision === 'approved' && fields.total >= assignment.passPercent)
  const canFinalise = feedbackOk && decisionOk && !finalise.isPending

  const onDraft = () =>
    saveDraft.mutate(
      {
        breakdown: fields.breakdown,
        feedback: fields.feedback,
        decision: fields.decision ?? undefined,
      },
      {
        onSuccess: () =>
          toast.success('Draft saved', { description: 'Only markers can see drafts.' }),
      },
    )

  const onFinalise = () => {
    if (!fields.decision) return
    finalise.mutate(
      { breakdown: fields.breakdown, feedback: fields.feedback.trim(), decision: fields.decision },
      {
        onSuccess: (result) => {
          setConfirming(false)
          toast.success(
            result.status === 'approved' ? 'Submission approved' : 'Returned for revision',
            {
              description: `${firstName} has an in-app notification. A demo email was generated in the notification log; no external email was sent.`,
            },
          )
        },
        onError: () => setConfirming(false),
      },
    )
  }

  const error = saveDraft.error ?? finalise.error
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        setConfirming(true)
      }}
      className="grid gap-5 rounded-xl border bg-card p-5 shadow-xs"
    >
      <div className="grid gap-1">
        <h2 className="font-display text-2xl font-light text-ink">
          Mark version {detail.current?.version}
        </h2>
        {draft ? (
          <p className="text-xs text-muted-foreground">Draft saved {qatarTime(draft.savedAt)}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Save a draft at any time. Learners only see final marks.
          </p>
        )}
      </div>
      <TotalReadout total={fields.total} passPercent={assignment.passPercent} />
      <RubricScorer
        rubric={assignment.rubric}
        breakdown={fields.breakdown}
        onChange={fields.setPart}
      />
      <div className="grid gap-2">
        <Label htmlFor="marking-feedback">Feedback for the learner</Label>
        <Textarea
          id="marking-feedback"
          value={fields.feedback}
          onChange={(event) => fields.setFeedback(event.target.value)}
          rows={5}
          maxLength={2000}
          placeholder="What worked, and one specific thing to improve."
          aria-invalid={fields.feedback.length > 0 && !feedbackOk}
          aria-describedby="marking-feedback-hint"
        />
        <p id="marking-feedback-hint" className="text-xs text-muted-foreground">
          At least a sentence. The learner sees this with the rubric.
        </p>
      </div>
      <DecisionPicker
        value={fields.decision}
        onChange={fields.setDecision}
        total={fields.total}
        passPercent={assignment.passPercent}
      />
      {error ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertTitle>Not saved</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <Button type="button" variant="outline" onClick={onDraft} disabled={saveDraft.isPending}>
          <Save aria-hidden /> {saveDraft.isPending ? 'Saving' : 'Save draft'}
        </Button>
        <Button type="submit" disabled={!canFinalise}>
          <Send aria-hidden className="rtl:-scale-x-100" /> Finalise
        </Button>
      </div>
      <SimulatedTag
        label="Learner email is a simulated demo email"
        className="justify-self-start"
      />
      <ActionDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={
          fields.decision === 'approved'
            ? `Approve with ${fields.total}/100?`
            : `Return to ${firstName} for revision?`
        }
        description={`${firstName} gets an in-app notification and a simulated demo email. After you finalise, any change needs a reason and is recorded in the audit log.`}
        confirmLabel={fields.decision === 'approved' ? 'Approve' : 'Return for revision'}
        onConfirm={onFinalise}
        pending={finalise.isPending}
      />
    </form>
  )
}
