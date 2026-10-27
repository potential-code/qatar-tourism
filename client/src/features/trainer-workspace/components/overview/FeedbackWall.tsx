import { MessageSquareQuote } from 'lucide-react'
import { ProgressRing } from '@/components/data/ProgressRing'
import { Stagger, StaggerItem } from '@/components/motion/Reveal'
import { EmptyState } from '@/components/ui/empty-state'
import type { OverviewData } from '../../types'

/** Recent session feedback the trainer wrote, with the score it came with. */
export function FeedbackWall({ data }: { data: OverviewData }) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby="feedback-heading">
      <h2 id="feedback-heading" className="font-display text-2xl font-light text-ink">
        Recent feedback
      </h2>
      {data.feedback.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/60">
          <EmptyState
            icon={MessageSquareQuote}
            title="No feedback yet"
            description="Feedback you give with session scores appears here."
          />
        </div>
      ) : (
        <Stagger className="grid gap-4 xl:grid-cols-2">
          {data.feedback.map((f) => (
            <StaggerItem key={f.id}>
              <figure className="flex h-full gap-4 rounded-xl border bg-card p-5 shadow-xs">
                <ProgressRing
                  value={f.total}
                  size={64}
                  strokeWidth={6}
                  ariaLabel={`Score ${f.total} out of 100`}
                >
                  <span className="font-display text-lg tabular-nums">{f.total}</span>
                </ProgressRing>
                <div className="min-w-0">
                  <blockquote className="text-sm leading-relaxed text-ink">
                    “{f.feedback}”
                  </blockquote>
                  <figcaption className="mt-2 text-xs text-muted-foreground">
                    {f.learnerCode} {f.displayName}, {f.sessionTitle}.{' '}
                    {f.status === 'final' ? 'Final score' : 'Draft score'}
                  </figcaption>
                </div>
              </figure>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </section>
  )
}
