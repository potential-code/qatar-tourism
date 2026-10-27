import { Link } from '@tanstack/react-router'
import { CalendarPlus } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { DateTile } from '@/features/sessions/components/DateTile'
import { FORMAT_LABEL, locationLabel } from '@/features/sessions/utils/session-labels'
import { qatarTime, relativeTo } from '@/lib/format/qatar-time'
import type { OverviewData } from '../../types'
import { SeatMeter } from '../shared/SeatMeter'
import { SessionStatusBadge } from '../shared/SessionStatusBadge'

/** Upcoming sessions as a vertical timeline, each row opening the session. */
export function UpcomingTimeline({ data }: { data: OverviewData }) {
  const reduce = useReducedMotion()
  return (
    <section
      className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-xs md:p-6"
      aria-labelledby="upcoming-heading"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="upcoming-heading" className="font-display text-2xl font-light text-ink">
          Upcoming sessions
        </h2>
        <Button asChild size="sm" variant="outline">
          <Link to="/trainer/sessions">All sessions</Link>
        </Button>
      </div>
      {data.upcoming.length === 0 ? (
        <EmptyState
          icon={CalendarPlus}
          title="Nothing scheduled"
          description="Create a session to publish it to the eligible catalogue."
          action={
            <Button asChild>
              <Link to="/trainer/sessions/new">Create a session</Link>
            </Button>
          }
        />
      ) : (
        <ol className="relative flex flex-col gap-3 before:absolute before:inset-y-3 before:start-8 before:w-px before:bg-stone">
          {data.upcoming.map((s, i) => (
            <motion.li
              key={s.id}
              initial={reduce ? false : { opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link
                to="/trainer/sessions/$sessionId"
                params={{ sessionId: s.id }}
                className="group relative flex gap-4 rounded-xl p-2 transition-colors hover:bg-sand focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <DateTile iso={s.startsAt} className="relative z-10 bg-white" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <SessionStatusBadge status={s.status} />
                    <span className="text-xs text-muted-foreground">
                      {s.code}, {relativeTo(s.startsAt, data.now)}
                    </span>
                  </div>
                  <p className="font-display text-lg leading-snug text-ink group-hover:text-teal-deep">
                    {s.title}
                  </p>
                  <p className="text-sm text-ink-soft">
                    {qatarTime(s.startsAt)} Qatar time. {FORMAT_LABEL[s.format]}, {locationLabel(s)}
                  </p>
                  <SeatMeter
                    confirmed={s.confirmed}
                    capacity={s.capacity}
                    waitlisted={s.waitlisted}
                    className="max-w-sm"
                  />
                </div>
              </Link>
            </motion.li>
          ))}
        </ol>
      )}
    </section>
  )
}
