import { Link } from '@tanstack/react-router'
import { Check, Clock, Lock } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { StageMap } from '@/features/learning/components/StageMap'
import type { Journey } from '@/features/learning/types'
import { minutesLabel } from '@/features/learning/utils/format'
import { itemLink } from '@/features/learning/utils/itemLink'
import { cn } from '@/lib/utils'

/** Progress bar, estimated time remaining and the steps of the active path (brief §5). */
export function JourneyCard({ journey }: { journey: Journey }) {
  const { enrolment } = journey
  const required = journey.items.filter((i) => i.required)
  return (
    <section
      aria-labelledby="journey-title"
      className="flex flex-col gap-6 rounded-xl border bg-white p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="journey-title" className="font-display text-2xl font-normal text-ink">
            Your journey
          </h2>
          <p className="text-sm text-muted-foreground">
            {enrolment.pathName ?? 'Learning path'}
            {enrolment.pathVersion ? `, version ${enrolment.pathVersion}` : ''}
          </p>
        </div>
        <p className="inline-flex items-center gap-1.5 rounded-full bg-sand-deep px-3 py-1 text-sm text-ink">
          <Clock aria-hidden className="size-4 text-teal" />
          {journey.remainingMinutes > 0
            ? `About ${minutesLabel(journey.remainingMinutes)} remaining`
            : 'No required time remaining'}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium tabular-nums text-ink">{enrolment.progressPercent}%</span>
        </div>
        <Progress value={enrolment.progressPercent} aria-label="Programme progress" />
      </div>
      {journey.gates.length > 0 ? (
        <StageMap gates={journey.gates} compact />
      ) : (
        <ol className="flex flex-wrap gap-2" aria-label="Required steps">
          {required.map((item) => {
            const link = itemLink(item, enrolment.programme)
            return (
              <li key={item.id}>
                <Link
                  to={link.to as never}
                  search={link.search as never}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-200 hover:border-teal focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none',
                    item.state === 'completed' && 'border-teal/30 bg-teal-mist text-teal-deep',
                    item.state === 'locked' && 'bg-sand-deep text-muted-foreground',
                    (item.state === 'available' || item.state === 'in_progress') &&
                      'border-maroon/30 bg-maroon-mist text-maroon-deep',
                  )}
                >
                  {item.state === 'completed' ? (
                    <Check aria-hidden className="size-3.5" />
                  ) : item.state === 'locked' ? (
                    <Lock aria-hidden className="size-3" />
                  ) : null}
                  {item.title}
                  <span className="sr-only">
                    {item.state === 'completed'
                      ? ', complete'
                      : item.state === 'locked'
                        ? ', locked'
                        : ', to do'}
                  </span>
                </Link>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
