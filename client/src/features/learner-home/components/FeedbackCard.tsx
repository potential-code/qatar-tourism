import { Link } from '@tanstack/react-router'
import { MessageSquareQuote } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import type { Journey } from '@/features/learning/types'
import { qatarDate } from '@/lib/format/qatar-time'

const initials = (name: string) =>
  name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

/** Trainer feedback on assignments and sessions (brief §5 dashboard content). */
export function FeedbackCard({ journey }: { journey: Journey }) {
  const latest = journey.feedback.slice(0, 2)
  const programme = journey.enrolment.programme
  return (
    <section
      aria-labelledby="feedback-title"
      className="flex flex-col gap-5 rounded-xl border bg-white p-6 shadow-sm"
    >
      <h2 id="feedback-title" className="font-display text-2xl font-normal text-ink">
        Trainer feedback
      </h2>
      {latest.length === 0 ? (
        <EmptyState
          icon={MessageSquareQuote}
          size="sm"
          title="No trainer feedback yet"
          description={
            programme === 'A'
              ? 'Feedback appears here after your trainer-led session and practical assignment are marked.'
              : 'A trainer reviews your short visitor response. Their feedback will appear here.'
          }
          action={
            <Link
              to={'/learner/assignments' as never}
              search={{ programme } as never}
              className="text-sm font-medium text-teal hover:underline"
            >
              Go to assignments
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {latest.map((item) => (
            <li key={`${item.source}-${item.at}`} className="flex gap-3">
              <Avatar className="size-9">
                <AvatarFallback className="bg-maroon-mist text-xs text-maroon-deep">
                  {initials(item.trainerName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-ink">{item.trainerName}</p>
                  <Badge
                    variant="outline"
                    className={
                      item.status === 'approved'
                        ? 'border-teal/30 text-teal-deep'
                        : 'border-maroon/30 text-maroon-deep'
                    }
                  >
                    {item.status === 'approved' ? 'Approved' : 'Revision requested'} · {item.score}
                    /100
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {item.title}, {qatarDate(item.at)}
                </p>
                <blockquote className="text-sm leading-relaxed text-ink/85">
                  “{item.text}”
                </blockquote>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
