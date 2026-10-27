import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight, CalendarX } from 'lucide-react'
import { SectionHeading } from '@/components/brand'
import { Reveal, Stagger, StaggerItem } from '@/components/motion'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { BookAction } from '@/features/programmes/components/BookAction'
import { SessionTicket } from '@/features/programmes/components/SessionTicket'
import { TrainerCard } from '@/features/programmes/components/TrainerCard'
import {
  trainersQuery,
  upcomingSessionsQuery,
} from '@/features/programmes/queries/programmes.queries'
import { SectionError } from './SectionState'

/** Sessions and trainers (brief §2, §16): real seeded upcoming sessions and trainer profiles. */
export function SessionsAndTrainers() {
  const sessions = useQuery(upcomingSessionsQuery())
  const trainers = useQuery(trainersQuery())
  return (
    <section id="sessions" aria-labelledby="sessions-title" className="scroll-mt-20">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-12 px-4 py-24 md:px-8 md:py-32">
        <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            title={<span id="sessions-title">Upcoming sessions and trainers</span>}
            description="Trainer-led practice in person at the Academy or live online. All trainers and sessions shown are fictional."
          />
          <Button asChild variant="outline" className="w-fit shrink-0">
            <Link to="/sessions">
              View all upcoming sessions
              <ArrowRight aria-hidden className="rtl:-scale-x-100" />
            </Link>
          </Button>
        </Reveal>

        {sessions.isPending ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-56 rounded-xl" />
            ))}
          </div>
        ) : sessions.isError ? (
          <SectionError what="the upcoming sessions" onRetry={() => sessions.refetch()} />
        ) : sessions.data.length === 0 ? (
          <EmptyState
            icon={CalendarX}
            title="No sessions are scheduled right now"
            description="New sessions appear here as soon as trainers publish them. Self-paced learning is always open."
            action={
              <Button asChild>
                <Link to="/programmes">Explore programmes</Link>
              </Button>
            }
          />
        ) : (
          <Stagger className="grid gap-4 lg:grid-cols-2" stagger={0.08}>
            {sessions.data.slice(0, 4).map((session) => (
              <StaggerItem key={session.id}>
                <SessionTicket
                  session={session}
                  action={<BookAction full={session.seatsRemaining === 0} />}
                  className="h-full"
                />
              </StaggerItem>
            ))}
          </Stagger>
        )}

        <div className="flex flex-col gap-6">
          <div className="flex items-end justify-between gap-4">
            <h3 className="font-display text-2xl md:text-3xl">Meet the trainers</h3>
            <Link
              to="/trainers"
              className="font-medium text-sm text-teal-deep underline-offset-4 hover:underline"
            >
              All trainer profiles
            </Link>
          </div>
          {trainers.isPending ? (
            <div className="flex gap-4 overflow-hidden">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-52 w-60 shrink-0 rounded-xl" />
              ))}
            </div>
          ) : trainers.isError ? (
            <SectionError what="the trainer profiles" onRetry={() => trainers.refetch()} />
          ) : (
            <ul
              aria-label="Trainers"
              className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 md:-mx-8 md:px-8 [scrollbar-width:thin]"
            >
              {trainers.data.map((trainer) => (
                <li key={trainer.code} className="w-60 shrink-0 snap-start">
                  <TrainerCard trainer={trainer} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
