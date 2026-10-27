import type { ProgrammeCode } from '@shared/constants'
import { Link } from '@tanstack/react-router'
import { MessagesSquare, Mic, Type } from 'lucide-react'
import { SimulatedTag } from '@/components/layout/SimulatedTag'
import { EmptyState } from '@/components/ui/empty-state'
import type { Journey } from '@/features/learning/types'
import { qatarDate } from '@/features/learning/utils/format'

/** Practice scores, tracked separately from knowledge scores (brief §5, §9). */
export function PracticeScores({
  practice,
  programme,
}: {
  practice: Journey['practice']
  programme: ProgrammeCode
}) {
  return (
    <section
      aria-labelledby="practice-title"
      className="flex flex-col gap-4 rounded-xl border bg-white p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="practice-title" className="font-display text-2xl font-normal text-ink">
            Practice scores
          </h2>
          <p className="text-sm text-muted-foreground">
            Formative only. They never count towards knowledge scores or certification.
          </p>
        </div>
        <SimulatedTag label={practice.label} />
      </div>
      {practice.attempts.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          size="sm"
          title="No practice yet"
          description="Text or voice role-play with a scripted visitor, scored on five criteria."
          action={
            <Link
              to={'/learner/practice' as never}
              search={{ programme } as never}
              className="text-sm font-medium text-teal hover:underline"
            >
              Go to AI practice
            </Link>
          }
        />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-sand p-4">
              <dt className="text-xs text-muted-foreground">Best</dt>
              <dd className="font-display text-3xl text-ink">{practice.best}/100</dd>
            </div>
            <div className="rounded-lg bg-sand p-4">
              <dt className="text-xs text-muted-foreground">Latest</dt>
              <dd className="font-display text-3xl text-ink">{practice.latest}/100</dd>
            </div>
          </dl>
          <ul className="flex flex-col divide-y">
            {practice.attempts.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="flex items-center gap-2 text-ink">
                  {a.mode === 'voice' ? (
                    <Mic aria-hidden className="size-4 text-teal" />
                  ) : (
                    <Type aria-hidden className="size-4 text-teal" />
                  )}
                  {a.scenario}
                  <span className="text-muted-foreground">
                    ({a.mode === 'voice' ? 'Voice' : 'Text'})
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-muted-foreground">{qatarDate(a.completedAt)}</span>
                  <span className="font-medium tabular-nums">{a.score}</span>
                </span>
              </li>
            ))}
          </ul>
          {practice.latestFeedback ? (
            <p className="rounded-lg bg-teal-mist p-3 text-sm text-ink">
              <span className="font-medium">Next time: </span>
              {practice.latestFeedback.retry}
            </p>
          ) : null}
        </>
      )}
    </section>
  )
}
