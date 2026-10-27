import { PencilLine } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RubricBreakdown } from '@/features/assignments/components/RubricBreakdown'
import { StatusPill } from '@/features/assignments/components/StatusPill'
import { SUBMISSION_STATUS, type SubmissionStatus } from '@/features/assignments/utils/status'
import { qatarTime } from '@/features/roleplay/utils/format'
import type { MarkingDetail } from '../types'
import { CorrectionDialog } from './CorrectionDialog'

/** A finalised mark, with the audited correction route. */
export function FinalMarkCard({ detail }: { detail: MarkingDetail }) {
  const [open, setOpen] = useState(false)
  const review = detail.current?.review
  if (!review) return null
  const status = SUBMISSION_STATUS[review.status as SubmissionStatus]
  return (
    <section className="grid gap-5 rounded-xl border bg-card p-5 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="grid gap-1">
          <h2 className="text-sm font-medium text-muted-foreground">
            Final mark, version {detail.current?.version}
          </h2>
          <p className="font-display text-5xl leading-none font-light tabular-nums text-ink">
            {review.score}
            <span className="text-xl text-muted-foreground">/100</span>
          </p>
        </div>
        <StatusPill label={status.label} tone={status.tone} />
      </div>
      <RubricBreakdown rubric={detail.assignment.rubric} breakdown={review.breakdown} />
      <blockquote className="rounded-lg bg-sand-deep/60 p-3 text-sm leading-relaxed text-ink">
        {review.feedback}
      </blockquote>
      <p className="text-xs text-muted-foreground">
        {review.reviewerName ?? 'Marker'}, {qatarTime(review.reviewedAt)}
      </p>
      {!detail.isLatest ? (
        <p className="rounded-lg bg-teal-mist/60 p-3 text-xs text-teal-deep">
          The learner has submitted a newer version. You can still correct the score or feedback
          here.
        </p>
      ) : null}
      <Button variant="outline" onClick={() => setOpen(true)} className="justify-self-start">
        <PencilLine aria-hidden /> Correct mark
      </Button>
      {open ? (
        <CorrectionDialog detail={detail} review={review} open={open} onOpenChange={setOpen} />
      ) : null}
    </section>
  )
}
