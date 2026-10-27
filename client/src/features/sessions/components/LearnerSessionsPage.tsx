import type { ProgrammeCode } from '@shared/constants'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CalendarSearch } from 'lucide-react'
import { useRef } from 'react'
import { EmptyState } from '@/components/ui/empty-state'
import { catalogueQuery, mySessionsQuery } from '../queries/sessions.queries'
import { BookingPolicyNote } from './BookingPolicyNote'
import { MySessionsPanel } from './MySessionsPanel'
import { ProgrammeBNotice } from './ProgrammeBNotice'
import { QueryErrorPanel } from './QueryErrorPanel'
import { SessionCatalogue } from './SessionCatalogue'
import { SessionsHero } from './SessionsHero'
import { SessionsSkeleton } from './SessionsSkeleton'

/**
 * Learner booking experience (brief §6): My sessions, then the eligible catalogue. A `programme`
 * (from a path item link) narrows the catalogue to that programme's sessions.
 */
export function LearnerSessionsPage({ programme }: { programme?: ProgrammeCode }) {
  const catalogue = useQuery(catalogueQuery())
  const mine = useQuery(mySessionsQuery())
  const browseRef = useRef<HTMLElement>(null)

  if (catalogue.isPending || mine.isPending) return <SessionsSkeleton />
  if (catalogue.isError || mine.isError) {
    return (
      <QueryErrorPanel
        error={catalogue.error ?? mine.error}
        onRetry={() => {
          void catalogue.refetch()
          void mine.refetch()
        }}
        title="Your sessions could not be loaded"
      />
    )
  }

  const codes = catalogue.data.programmes.map((p) => p.code)
  const hasB = codes.includes('B')
  const now = new Date(mine.data.now)
  const upcoming = mine.data.items
    .filter(
      (b) =>
        (b.status === 'confirmed' || b.status === 'waitlisted') &&
        b.session.status !== 'cancelled' &&
        new Date(b.session.endsAt) > now,
    )
    .sort((a, b) => a.session.startsAt.localeCompare(b.session.startsAt))
  const inProgramme = programme
    ? catalogue.data.items.filter((s) => s.programmeCode === programme)
    : catalogue.data.items
  const narrowed = inProgramme.length > 0 && inProgramme.length < catalogue.data.items.length
  const browse = () => browseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="flex flex-col gap-10">
      <SessionsHero
        catalogue={catalogue.data}
        upcomingCount={upcoming.length}
        nextStart={upcoming[0]?.session.startsAt ?? null}
      />
      <MySessionsPanel data={mine.data} catalogue={catalogue.data.items} onBrowse={browse} />
      <section
        ref={browseRef}
        aria-labelledby="browse-heading"
        className="flex scroll-mt-24 flex-col gap-5"
      >
        <div className="grid gap-2">
          <h2 id="browse-heading" className="font-display text-2xl font-light text-ink md:text-3xl">
            Book a session
          </h2>
          <p className="max-w-[70ch] text-muted-foreground">
            Sessions in your programmes, with seats remaining and any prerequisite. A locked session
            tells you what is missing.
          </p>
        </div>
        {hasB ? <ProgrammeBNotice onlyB={!codes.includes('A')} /> : null}
        <BookingPolicyNote />
        {codes.length === 0 ? (
          <EmptyState
            icon={CalendarSearch}
            title="You are not enrolled in a programme yet"
            description="Enrol in a programme to see its sessions here."
          />
        ) : catalogue.data.items.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card/60">
            <EmptyState
              icon={CalendarSearch}
              title="No upcoming sessions are open right now"
              description="New sessions are published by Academy trainers. Check back soon."
            />
          </div>
        ) : (
          <>
            {narrowed ? (
              <p className="text-muted-foreground text-sm">
                Showing Program {programme} sessions.{' '}
                <Link to="/learner/sessions" className="font-medium text-teal underline">
                  Show all programmes
                </Link>
              </p>
            ) : null}
            <SessionCatalogue sessions={narrowed ? inProgramme : catalogue.data.items} />
          </>
        )}
      </section>
    </div>
  )
}
