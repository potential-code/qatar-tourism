import type { ProgrammeCode } from '@shared/constants'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CalendarSearch } from 'lucide-react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/ui/empty-state'
import { useActiveProgramme } from '@/features/learning/hooks/useActiveProgramme'
import { catalogueQuery, mySessionsQuery } from '../queries/sessions.queries'
import { BookingPolicyNote } from './BookingPolicyNote'
import { MySessionsPanel } from './MySessionsPanel'
import { ProgrammeBNotice } from './ProgrammeBNotice'
import { ProgrammeBSessions } from './ProgrammeBSessions'
import { QueryErrorPanel } from './QueryErrorPanel'
import { RequestsPanel } from './RequestsPanel'
import { SessionCatalogue } from './SessionCatalogue'
import { SessionsHero } from './SessionsHero'
import { SessionsSkeleton } from './SessionsSkeleton'

const LIVE = ['confirmed', 'waitlisted', 'offered']

/**
 * Learner booking experience (brief §6): My sessions, then the eligible catalogue. A `programme`
 * (from a path item link) narrows the catalogue to that programme's sessions. With Program B
 * active (the route's `programme` wins over the switcher) the page only explains that B has no
 * required sessions (brief §5) and links on.
 */
export function LearnerSessionsPage({ programme }: { programme?: ProgrammeCode }) {
  const { t } = useTranslation('sessions')
  const active = useActiveProgramme()
  const catalogue = useQuery(catalogueQuery())
  const mine = useQuery(mySessionsQuery())
  const browseRef = useRef<HTMLElement>(null)

  if (active.isLoading) return <SessionsSkeleton />
  if ((programme ?? active.programme) === 'B') {
    return <ProgrammeBSessions holdsA={active.enrolments.some((e) => e.programme === 'A')} />
  }
  if (catalogue.isPending || mine.isPending) return <SessionsSkeleton />
  if (catalogue.isError || mine.isError) {
    return (
      <QueryErrorPanel
        error={catalogue.error ?? mine.error}
        onRetry={() => {
          void catalogue.refetch()
          void mine.refetch()
        }}
        title={t('page.loadError')}
      />
    )
  }

  const codes = catalogue.data.programmes.map((p) => p.code)
  const hasB = codes.includes('B')
  const now = new Date(mine.data.now)
  const upcoming = mine.data.items
    .filter(
      (b) =>
        LIVE.includes(b.status) &&
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
      <RequestsPanel canRequestA={!codes.includes('A')} />
      <section
        ref={browseRef}
        aria-labelledby="browse-heading"
        className="flex scroll-mt-24 flex-col gap-5"
      >
        <div className="grid gap-2">
          <h2 id="browse-heading" className="font-display text-2xl font-light text-ink md:text-3xl">
            {t('browse.heading')}
          </h2>
          <p className="max-w-[70ch] text-muted-foreground">{t('browse.intro')}</p>
        </div>
        {hasB ? <ProgrammeBNotice onlyB={!codes.includes('A')} /> : null}
        <BookingPolicyNote />
        {codes.length === 0 ? (
          <EmptyState
            icon={CalendarSearch}
            title={t('browse.noProgrammesTitle')}
            description={t('browse.noProgrammesBody')}
          />
        ) : catalogue.data.items.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card/60">
            <EmptyState
              icon={CalendarSearch}
              title={t('browse.noSessionsTitle')}
              description={t('browse.noSessionsBody')}
            />
          </div>
        ) : (
          <>
            {narrowed ? (
              <p className="text-muted-foreground text-sm">
                {t('browse.showing', { code: programme })}{' '}
                <Link to="/learner/sessions" className="font-medium text-teal underline">
                  {t('browse.showAll')}
                </Link>
              </p>
            ) : null}
            <SessionCatalogue
              sessions={narrowed ? inProgramme : catalogue.data.items}
              offerWindowHours={catalogue.data.offerWindowHours}
            />
          </>
        )}
      </section>
    </div>
  )
}
