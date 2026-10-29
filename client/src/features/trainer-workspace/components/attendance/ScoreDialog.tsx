import { SESSION_RUBRIC, THRESHOLDS } from '@shared/constants'
import { CheckCircle2, XCircle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ProgressRing } from '@/components/data/ProgressRing'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api-error'
import { useRecordScore } from '../../queries/trainer.queries'
import type { RosterRow } from '../../types'

type Key = (typeof SESSION_RUBRIC)[number]['key']

/**
 * Rubric scoring (brief §10): preparation 20, communication 30, practical 30, professionalism 20,
 * pass at 70. Save a draft or submit final; a final score changed later needs a reason.
 */
export function ScoreDialog({
  row,
  onOpenChange,
}: {
  row: RosterRow | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={Boolean(row)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        {row ? <ScoreForm key={row.rsvpId} row={row} close={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function ScoreForm({ row, close }: { row: RosterRow; close: () => void }) {
  const record = useRecordScore()
  const final = row.score?.status === 'final'
  const [values, setValues] = useState<Record<Key, string>>(() => ({
    preparation: String(row.score?.preparation ?? ''),
    communication: String(row.score?.communication ?? ''),
    practical: String(row.score?.practical ?? ''),
    professionalism: String(row.score?.professionalism ?? ''),
  }))
  const [feedback, setFeedback] = useState(row.score?.feedback ?? '')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const total = SESSION_RUBRIC.reduce((sum, r) => sum + (Number(values[r.key]) || 0), 0)
  const passed = total >= THRESHOLDS.sessionPass

  async function save(status: 'draft' | 'final') {
    setError(null)
    for (const r of SESSION_RUBRIC) {
      const n = Number(values[r.key])
      if (values[r.key] === '' || !Number.isInteger(n) || n < 0 || n > r.max) {
        return setError(`${r.label} must be a whole number from 0 to ${r.max}.`)
      }
    }
    if (final && reason.trim().length < 5)
      return setError(
        'This score is final. Give a reason for the correction (at least 5 characters).',
      )
    try {
      await record.mutateAsync({
        rsvpId: row.rsvpId,
        preparation: Number(values.preparation),
        communication: Number(values.communication),
        practical: Number(values.practical),
        professionalism: Number(values.professionalism),
        feedback: feedback.trim() || undefined,
        status,
        correctionReason: final ? reason.trim() : undefined,
      })
      toast.success(
        status === 'final'
          ? `Final score ${total}/100 saved. Learner progress updated.`
          : `Draft score ${total}/100 saved.`,
      )
      close()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The score could not be saved. Try again.')
    }
  }

  return (
    <>
      <DialogHeader className="text-start">
        <DialogTitle className="font-display text-2xl font-normal">
          Score {row.learnerCode} {row.displayName}
        </DialogTitle>
        <DialogDescription>
          Session rubric out of 100. Demo pass mark {THRESHOLDS.sessionPass}. Attendance:{' '}
          {row.attendance}.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="grid gap-3">
          {SESSION_RUBRIC.map((r) => (
            <div key={r.key} className="grid grid-cols-[1fr_6rem] items-center gap-3">
              <Label htmlFor={`rubric-${r.key}`}>
                {r.label} <span className="text-muted-foreground">(of {r.max})</span>
              </Label>
              <Input
                id={`rubric-${r.key}`}
                type="number"
                inputMode="numeric"
                min={0}
                max={r.max}
                value={values[r.key]}
                onChange={(e) => setValues((v) => ({ ...v, [r.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center gap-2" aria-live="polite">
          <ProgressRing
            value={total}
            size={112}
            strokeWidth={9}
            ariaLabel={`Total ${total} out of 100`}
          >
            <span className="font-display text-3xl tabular-nums">{total}</span>
          </ProgressRing>
          <span
            className={
              passed
                ? 'inline-flex items-center gap-1 text-sm text-success'
                : 'inline-flex items-center gap-1 text-sm text-destructive'
            }
          >
            {passed ? (
              <CheckCircle2 aria-hidden className="size-4" />
            ) : (
              <XCircle aria-hidden className="size-4" />
            )}
            {passed ? 'Pass' : 'Below pass mark'}
          </span>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="score-feedback">Short feedback</Label>
        <Textarea
          id="score-feedback"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          maxLength={1000}
          rows={3}
        />
      </div>
      {final ? (
        <div className="grid gap-2">
          <Label htmlFor="score-reason">Correction reason (required, audited)</Label>
          <Textarea
            id="score-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={300}
            rows={2}
          />
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <DialogFooter className="gap-2">
        {!final ? (
          <Button variant="outline" onClick={() => save('draft')} disabled={record.isPending}>
            Save draft
          </Button>
        ) : null}
        <Button onClick={() => save('final')} disabled={record.isPending}>
          {final ? 'Save correction' : 'Submit final score'}
        </Button>
      </DialogFooter>
    </>
  )
}
