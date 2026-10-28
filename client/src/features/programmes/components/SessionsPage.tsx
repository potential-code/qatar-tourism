import type { ProgrammeCode } from '@shared/constants'
import { useQuery } from '@tanstack/react-query'
import { CalendarX } from 'lucide-react'
import { useState } from 'react'
import { DemoBadge } from '@/components/layout'
import { Stagger, StaggerItem } from '@/components/motion'
import { EmptyState } from '@/components/ui/empty-state'
import { SegmentedControl, SegmentedControlItem } from '@/components/ui/segmented-control'
import { Skeleton } from '@/components/ui/skeleton'
import { PublicLayout } from '@/features/public-site/components/PublicLayout'
import { SectionError } from '@/features/public-site/components/SectionState'
import { upcomingSessionsQuery } from '../queries/programmes.queries'
import { sessionDay } from '../utils/format'
import { BookAction } from './BookAction'
import { PublicPageIntro } from './PublicPageIntro'
import { SessionTicket } from './SessionTicket'

type Filter = 'all' | ProgrammeCode

/** Public upcoming sessions (brief §2, §16), grouped by Qatar calendar day. */
export function SessionsPage() {
  const [filter, setFilter] = useState<Filter>('all')
  const { data, isPending, isError, refetch } = useQuery(
    upcomingSessionsQuery(filter === 'all' ? undefined : filter),
  )
  const days = new Map<string, NonNullable<typeof data>>()
  for (const session of data ?? []) {
    const day = sessionDay(session.startsAt, true)
    days.set(day, [...(days.get(day) ?? []), session])
  }
  return (
    <PublicLayout overlayHeader>
      <PublicPageIntro
        title="Upcoming sessions"
        image="/images/official/grid-qatar-national-library-2-7740-wip-5.jpg"
        alt="Reading hall of the Qatar National Library"
      >
        Trainer-led sessions in person at the Academy or live online. All times are shown in Qatar
        time. Sign in to book: eligibility and seats are checked when you book.
      </PublicPageIntro>
      <div className="mx-auto flex max-w-[1100px] flex-col gap-10 px-4 py-14 md:px-8 md:py-20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SegmentedControl
            aria-label="Filter by programme"
            value={filter}
            onValueChange={(value) => setFilter(value as Filter)}
          >
            <SegmentedControlItem value="all">All</SegmentedControlItem>
            <SegmentedControlItem value="A">Program A</SegmentedControlItem>
            <SegmentedControlItem value="B">Program B</SegmentedControlItem>
            <SegmentedControlItem value="C">Program C</SegmentedControlItem>
          </SegmentedControl>
          <DemoBadge compact />
        </div>
        {isPending ? (
          <div className="grid gap-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : isError ? (
          <SectionError what="the sessions" onRetry={() => refetch()} />
        ) : data.length === 0 ? (
          <EmptyState
            icon={CalendarX}
            title="No upcoming sessions for this programme"
            description="Try another programme, or check back once trainers publish new dates."
          />
        ) : (
          <div className="grid gap-12">
            {[...days.entries()].map(([day, sessions]) => (
              <section key={day} aria-label={day} className="grid gap-4">
                <h2 className="font-display text-2xl">{day}</h2>
                <Stagger className="grid gap-4" stagger={0.06}>
                  {sessions.map((session) => (
                    <StaggerItem key={session.id}>
                      <SessionTicket
                        session={session}
                        action={<BookAction full={session.seatsRemaining === 0} />}
                      />
                    </StaggerItem>
                  ))}
                </Stagger>
              </section>
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  )
}
