import { MessageSquareQuote } from 'lucide-react'
import { CountUp } from '@/components/motion/CountUp'
import { qatarDateTime } from '@/lib/format/qatar-time'
import { cn } from '@/lib/utils'
import type { AssignmentVersion, RubricItem, VersionReview } from '../types'
import { RubricBreakdown } from './RubricBreakdown'

interface FeedbackPanelProps {
  version: AssignmentVersion
  review: VersionReview
  rubric: RubricItem[]
  passPercent: number
}

/** Trainer feedback for one version: mark against the pass mark, rubric and comments. */
export function FeedbackPanel({ version, review, rubric, passPercent }: FeedbackPanelProps) {
  const passed = review.score >= passPercent
  return (
    <section
      aria-labelledby={`feedback-${version.id}`}
      className="rounded-[1.25rem] bg-white/60 p-1.5 shadow-sm ring-1 ring-ink/5"
    >
      <div className="grid gap-6 rounded-[calc(1.25rem-0.375rem)] border border-border/60 bg-card p-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="grid content-start gap-3">
          <h2 id={`feedback-${version.id}`} className="text-sm font-medium text-muted-foreground">
            Trainer feedback on version {version.version}
          </h2>
          <p className="font-display text-6xl leading-none font-light tabular-nums text-ink">
            <CountUp value={review.score} />
            <span className="text-2xl text-muted-foreground">/100</span>
          </p>
          <p
            className={cn(
              'w-fit rounded-full px-2.5 py-0.5 text-xs font-medium',
              passed ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning',
            )}
          >
            {passed
              ? `Meets the pass mark of ${passPercent}`
              : `Below the pass mark of ${passPercent}`}
          </p>
          <RubricBreakdown rubric={rubric} breakdown={review.breakdown} />
        </div>
        <div className="grid content-start gap-3">
          <blockquote className="flex gap-3 rounded-xl bg-sand-deep/60 p-4 text-[15px] leading-relaxed text-ink">
            <MessageSquareQuote aria-hidden className="mt-1 size-4 shrink-0 text-maroon/70" />
            <span>{review.feedback}</span>
          </blockquote>
          <p className="text-sm text-muted-foreground">
            {review.reviewerName ?? 'Your trainer'}, {qatarDateTime(review.reviewedAt)}
          </p>
          {version.correctedAt ? (
            <p className="text-xs text-muted-foreground">
              Your trainer updated this mark on {qatarDateTime(version.correctedAt)}.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
