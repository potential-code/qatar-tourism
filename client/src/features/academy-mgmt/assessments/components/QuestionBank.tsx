import {
  ASSESSMENT_VERSION,
  type AssessmentVariant,
  QUESTION_BANK,
} from '@shared/content/assessments'
import { CircleCheck } from 'lucide-react'
import { useState } from 'react'
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control'
import { cn } from '@/lib/utils'

/** Baseline and parallel post items, one per competency, the correct answer marked (brief §8). */
export function QuestionBank() {
  const [variant, setVariant] = useState<AssessmentVariant>('baseline')
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          aria-label="Question set"
          value={variant}
          onValueChange={(v) => setVariant(v as AssessmentVariant)}
        >
          <SegmentedControlItem value="baseline">Baseline</SegmentedControlItem>
          <SegmentedControlItem value="post">Post-assessment</SegmentedControlItem>
        </SegmentedControl>
        <p className="text-xs text-muted-foreground">
          Version {ASSESSMENT_VERSION}. Five items, 20 points each. Answer order is shuffled for
          learners.
        </p>
      </div>
      <ol className="grid gap-3">
        {QUESTION_BANK[variant].map((q, i) => (
          <li key={q.competency} className="grid gap-3 rounded-xl border p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium text-ink">
                <span className="me-2 font-display text-lg text-teal tabular-nums">{i + 1}</span>
                {q.prompt}
              </p>
              <span className="rounded-full bg-teal-mist px-2 py-0.5 text-xs text-teal-deep">
                {q.competencyLabel}
              </span>
            </div>
            <ul className="grid gap-1.5 sm:grid-cols-3">
              {q.options.map((o) => {
                const correct = o.key === q.correct
                return (
                  <li
                    key={o.key}
                    className={cn(
                      'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm',
                      correct ? 'border-success/30 bg-success/5 text-ink' : 'text-muted-foreground',
                    )}
                  >
                    {correct ? (
                      <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                    ) : (
                      <span className="mt-0.5 size-4 shrink-0 text-center text-xs">{o.key}</span>
                    )}
                    <span>
                      {o.text}
                      {correct ? <span className="sr-only"> (correct answer)</span> : null}
                    </span>
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  )
}
