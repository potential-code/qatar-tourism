import type { ProgrammeCode } from '@shared/constants'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { SectionHeading } from '@/components/brand'
import { Reveal, Stagger, StaggerItem } from '@/components/motion'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PublicLayout } from '@/features/public-site/components/PublicLayout'
import { SectionError } from '@/features/public-site/components/SectionState'
import { ILLUSTRATIVE_NOTE, PROGRAMME_COPY } from '../content'
import { useProgrammeCta } from '../hooks'
import { programmeQuery } from '../queries/programmes.queries'
import { BookAction } from './BookAction'
import { CompletionRules } from './CompletionRules'
import { IllustrativeTag } from './IllustrativeTag'
import { PageHero } from './PageHero'
import { PersonalisedPaths } from './PersonalisedPaths'
import { ProgrammeFacts } from './ProgrammeFacts'
import { SamplePreview } from './SamplePreview'
import { SessionTicket } from './SessionTicket'
import { TrainerCard } from './TrainerCard'
import { UnitList } from './UnitList'

/** Programme overview (brief §3): outcomes, audience, units, prerequisites, effort, trainers, rules. */
export function ProgrammeDetailPage({ code }: { code: ProgrammeCode }) {
  const { data, isPending, isError, refetch } = useQuery(programmeQuery(code))
  const copy = PROGRAMME_COPY[code]
  const cta = useProgrammeCta(code, data?.cta ?? '')

  const primary = data ? (
    <Button asChild size="lg" className="w-fit">
      <Link to={cta.to as never} params={cta.params as never} hash={cta.hash}>
        {cta.label}
        <ArrowRight aria-hidden className="rtl:-scale-x-100" />
      </Link>
    </Button>
  ) : null

  return (
    <PublicLayout overlayHeader>
      <PageHero
        image={copy.heroImage}
        alt={copy.heroAlt}
        back={{ label: 'All programmes', to: '/programmes' }}
        eyebrow={
          <span className="flex flex-wrap items-center gap-2 font-medium text-sm text-white/90">
            Program {code}
            {code === 'C' ? <IllustrativeTag /> : null}
          </span>
        }
        title={data?.title ?? <Skeleton className="h-14 w-80 bg-white/20" />}
      >
        {data ? (
          <>
            <p className="max-w-2xl text-lg text-white/85 leading-relaxed">{data.summary}</p>
            <p className="text-sm text-white/75">{data.formatLine}</p>
            {primary}
          </>
        ) : null}
      </PageHero>

      <div className="mx-auto flex max-w-[1400px] flex-col gap-20 px-4 py-16 md:px-8 md:py-24">
        {isPending ? (
          <div className="grid gap-6">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-80 rounded-xl" />
          </div>
        ) : isError ? (
          <SectionError what="this programme" onRetry={() => refetch()} />
        ) : (
          <>
            {data.isIllustrative ? (
              <p
                role="note"
                className="rounded-xl border border-maroon/15 bg-maroon-mist p-5 text-maroon-deep text-sm leading-relaxed"
              >
                {ILLUSTRATIVE_NOTE}
              </p>
            ) : null}
            <Reveal className="relative z-10 md:-mt-36">
              <ProgrammeFacts programme={data} />
            </Reveal>

            <section
              aria-labelledby="outcomes-title"
              className="grid gap-10 lg:grid-cols-[7fr_5fr] lg:gap-16"
            >
              <div className="grid content-start gap-6">
                <h2 id="outcomes-title" className="font-display font-light text-3xl md:text-4xl">
                  What you will be able to do
                </h2>
                <Stagger className="grid gap-3">
                  {copy.outcomes.map((outcome) => (
                    <StaggerItem key={outcome}>
                      <p className="flex gap-3 text-base leading-relaxed">
                        <CheckCircle2 aria-hidden className="mt-1 size-5 shrink-0 text-teal" />
                        {outcome}
                      </p>
                    </StaggerItem>
                  ))}
                </Stagger>
              </div>
              <dl className="grid content-start gap-6 rounded-xl bg-sand-deep p-7">
                <div className="grid gap-1.5">
                  <dt className="font-display text-xl">Who it is for</dt>
                  <dd className="text-muted-foreground text-sm leading-relaxed">
                    {copy.audienceDetail}
                  </dd>
                </div>
                <div className="grid gap-1.5">
                  <dt className="font-display text-xl">Prerequisites</dt>
                  <dd className="text-muted-foreground text-sm leading-relaxed">
                    {copy.prerequisites}
                  </dd>
                </div>
                <div className="grid gap-1.5">
                  <dt className="font-display text-xl">Expected effort</dt>
                  <dd className="text-muted-foreground text-sm leading-relaxed">{copy.effort}</dd>
                </div>
              </dl>
            </section>

            {code === 'C' ? <SamplePreview /> : null}

            <section aria-labelledby="units-title" className="grid gap-8">
              <SectionHeading
                title={
                  <span id="units-title">{code === 'C' ? 'Sample unit' : 'Units and stages'}</span>
                }
                description={
                  code === 'B'
                    ? 'The general path is shown. Your profile can change the selection or order of units within the one stage.'
                    : code === 'A'
                      ? 'The standard professional path: foundation units, practice, a trainer session, an assignment and the final assessment.'
                      : undefined
                }
              />
              <UnitList units={data.units} levels={data.levels} />
            </section>

            {code === 'B' ? <PersonalisedPaths paths={data.paths} /> : null}

            <section aria-labelledby="rules-title" className="grid gap-8">
              <SectionHeading title={<span id="rules-title">Completion rules</span>} />
              <CompletionRules programme={data} />
            </section>

            {data.trainers.length > 0 ? (
              <section aria-labelledby="trainers-title" className="grid gap-8">
                <SectionHeading
                  title={<span id="trainers-title">Trainers</span>}
                  description={
                    code === 'B'
                      ? 'Optional clinics are available with these trainers. They are never required for Program B.'
                      : 'Fictional trainers approved for this programme.'
                  }
                />
                <ul
                  aria-label="Trainers"
                  className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 md:-mx-8 md:px-8 [scrollbar-width:thin]"
                >
                  {data.trainers.map((trainer) => (
                    <li key={trainer.code} className="w-60 shrink-0 snap-start">
                      <TrainerCard trainer={{ ...trainer, programmes: [code] }} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {data.upcomingSessions.length > 0 ? (
              <section aria-labelledby="programme-sessions-title" className="grid gap-8">
                <SectionHeading
                  title={<span id="programme-sessions-title">Upcoming sessions</span>}
                />
                <div className="grid gap-4 lg:grid-cols-2">
                  {data.upcomingSessions.slice(0, 4).map((session) => (
                    <SessionTicket
                      key={session.id}
                      session={session}
                      action={<BookAction full={session.seatsRemaining === 0} />}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {code !== 'C' ? (
              <Reveal className="flex flex-col items-start gap-5 rounded-xl bg-teal-deep p-8 text-white md:flex-row md:items-center md:justify-between md:p-12">
                <p className="max-w-xl font-display text-2xl leading-snug md:text-3xl">
                  {code === 'A'
                    ? 'Ready for a structured, certified route? Any Program B progress stays exactly as it is.'
                    : 'Start with a short profile and a five-question baseline.'}
                </p>
                <Button asChild size="lg" variant="glass">
                  <Link to={cta.to as never} params={cta.params as never}>
                    {cta.label}
                  </Link>
                </Button>
              </Reveal>
            ) : null}
          </>
        )}
      </div>
    </PublicLayout>
  )
}
