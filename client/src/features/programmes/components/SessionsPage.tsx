import type { ProgrammeCode } from '@shared/constants'
import { useQuery } from '@tanstack/react-query'
import { CalendarX } from 'lucide-react'
import { useState } from 'react'
import { DemoBadge } from '@/components/layout'
import { Stagger, StaggerItem } from '@/components/motion'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
    <PublicLayout>
      <div className="mx-auto flex max-w-[1100px] flex-col gap-10 px-4 pt-32 pb-24 md:px-8 md:pt-40">
        <PublicPageIntro title="Upcoming sessions">
          Trainer-led sessions in person at the Academy or live online. All times are shown in Qatar
          time. Sign in to book: eligibility and seats are checked when you book.
        </PublicPageIntro>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
            <TabsList aria-label="Filter by programme">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="A">Program A</TabsTrigger>
              <TabsTrigger value="B">Program B</TabsTrigger>
              <TabsTrigger value="C">Program C</TabsTrigger>
            </TabsList>
          </Tabs>
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
