import type { ProgrammeCode } from '@shared/constants'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { CornerPattern, Eyebrow, SectionHeading } from '@/components/brand'
import { Magnetic, Parallax, ScrollReveal, SplitWords } from '@/components/motion'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { PublicLayout } from '@/features/public-site/components/PublicLayout'
import { SectionError } from '@/features/public-site/components/SectionState'
import { cn } from '@/lib/utils'
import { ILLUSTRATIVE_NOTE, PROGRAMME_COPY } from '../content'
import { useProgrammeCta } from '../hooks'
import { programmeQuery } from '../queries/programmes.queries'
import { accent, PROGRAMME_TONE } from '../tone'
import { BookAction } from './BookAction'
import { CompletionRules } from './CompletionRules'
import { IllustrativeTag } from './IllustrativeTag'
import { PageHero } from './PageHero'
import { PersonalisedPaths } from './PersonalisedPaths'
import { ProgrammeFacts } from './ProgrammeFacts'
import { SamplePreview } from './SamplePreview'
import { SessionTicket, SHOWCASE_TICKET, ticketTone } from './SessionTicket'
import { TrainerCard, type TrainerTone } from './TrainerCard'
import { UnitList } from './UnitList'

const TRAINER_TONES: TrainerTone[] = ['teal', 'maroon', 'sky', 'gold']

/** A full-width band with its own ground and star corners; content reveals in reading order. */
function Band({
  children,
  className,
  side = 'a',
  dark = false,
  labelledBy,
}: {
  children: ReactNode
  className?: string
  side?: 'a' | 'b'
  dark?: boolean
  labelledBy?: string
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={cn('relative isolate overflow-hidden', dark && 'text-white', className)}
    >
      <CornerPattern side={side} tone={dark ? 'dark' : 'light'} />
      <ScrollReveal className="mx-auto flex max-w-[1400px] flex-col gap-10 px-4 py-16 md:px-8 md:py-20">
        {children}
      </ScrollReveal>
    </section>
  )
}

/** Programme overview (brief §3): outcomes, audience, units, prerequisites, effort, trainers, rules. */
export function ProgrammeDetailPage({ code }: { code: ProgrammeCode }) {
  const { data, isPending, isError, refetch } = useQuery(programmeQuery(code))
  const copy = PROGRAMME_COPY[code]
  const tone = PROGRAMME_TONE[code]
  const cta = useProgrammeCta(code, data?.cta ?? '')

  const primary = data ? (
    <Magnetic className="w-fit">
      <Button
        asChild
        size="lg"
        className="group h-14 bg-white px-8 text-base text-teal-deep shadow-lg hover:bg-gold-soft hover:text-teal-night"
      >
        <Link to={cta.to as never} params={cta.params as never} hash={cta.hash}>
          {cta.label}
          <ArrowRight
            aria-hidden
            className="transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1"
          />
        </Link>
      </Button>
    </Magnetic>
  ) : null

  return (
    <PublicLayout overlayHeader>
      <PageHero
        image={copy.heroImage}
        alt={copy.heroAlt}
        programme={code}
        back={{ label: 'All programmes', to: '/programmes' }}
        eyebrow={
          <span className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-medium text-sm shadow-lg',
                tone.solid,
              )}
            >
              <span className="font-display text-base leading-none">{code}</span>
              <span aria-hidden className="h-3 w-px bg-current opacity-40" />
              Program {code}
            </span>
            {code === 'C' ? <IllustrativeTag /> : null}
          </span>
        }
        title={data?.title ?? <Skeleton className="h-14 w-80 bg-white/20" />}
      >
        {data ? (
          <>
            <p className="max-w-2xl border-gold/60 border-s-2 ps-5 text-lg text-white/90 leading-relaxed">
              {data.summary}
            </p>
            <p className="text-sm text-white/75">{data.formatLine}</p>
            {primary}
          </>
        ) : null}
      </PageHero>

      {isPending ? (
        <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-16 md:px-8">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      ) : isError ? (
        <div className="mx-auto max-w-[1400px] px-4 py-16 md:px-8">
          <SectionError what="this programme" onRetry={() => refetch()} />
        </div>
      ) : (
        <>
          {/* Facts overlap the hero; the outcomes follow on the same warm ground. */}
          <section aria-labelledby="outcomes-title" className="relative isolate bg-sand-deep">
            <CornerPattern side="b" />
            <ScrollReveal className="mx-auto flex max-w-[1400px] flex-col gap-12 px-4 pb-16 md:px-8 md:pb-20">
              <div className="relative z-10 -mt-28 md:-mt-32">
                <ProgrammeFacts programme={data} />
              </div>
              {data.isIllustrative ? (
                <p
                  role="note"
                  data-reveal
                  className="rounded-2xl border border-maroon/15 bg-rose-mist p-5 text-maroon-deep text-sm leading-relaxed"
                >
                  {ILLUSTRATIVE_NOTE}
                </p>
              ) : null}
              <div className="grid gap-10 lg:grid-cols-[7fr_5fr] lg:gap-12">
                <div className="grid content-start gap-6">
                  <div data-reveal>
                    <Eyebrow index="01">Outcomes</Eyebrow>
                  </div>
                  <h2
                    id="outcomes-title"
                    className="font-display font-light text-4xl leading-[1.08] md:text-5xl"
                  >
                    <SplitWords text="What you will be able to do" />
                  </h2>
                  <ul className="grid gap-3">
                    {copy.outcomes.map((outcome, index) => (
                      <li
                        key={outcome}
                        data-reveal="card"
                        className={cn(
                          'group relative flex gap-4 overflow-hidden rounded-2xl bg-gradient-to-r via-white to-white p-5 shadow-card ring-1 ring-ink/5 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 motion-reduce:hover:transform-none',
                          accent(index).mist,
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn('absolute inset-y-0 start-0 w-1', accent(index).bar)}
                        />
                        <CheckCircle2
                          aria-hidden
                          className={cn('mt-0.5 size-6 shrink-0', accent(index).icon)}
                        />
                        <span className="text-base leading-relaxed">{outcome}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <dl
                  data-reveal="card"
                  className={cn(
                    'qt-grain relative isolate grid content-start gap-7 overflow-hidden rounded-[1.75rem] p-8 shadow-xl md:p-10',
                    tone.solid,
                  )}
                >
                  <span
                    aria-hidden
                    className="qt-star-tile-dark absolute inset-x-0 bottom-0 -z-10 h-2/3 [mask-image:linear-gradient(to_top,black,transparent)]"
                  />
                  {[
                    ['Who it is for', copy.audienceDetail],
                    ['Prerequisites', copy.prerequisites],
                    ['Expected effort', copy.effort],
                  ].map(([term, detail]) => (
                    <div
                      key={term}
                      className="grid gap-2 border-current/15 border-b pb-6 last:border-b-0 last:pb-0"
                    >
                      <dt className="font-display text-2xl">{term}</dt>
                      <dd className="text-sm leading-relaxed opacity-85">{detail}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </ScrollReveal>
          </section>

          {code === 'C' ? (
            <Band side="a" className="bg-gradient-to-b from-sky-mist to-sand">
              <SamplePreview />
            </Band>
          ) : null}

          <Band
            side="a"
            labelledBy="units-title"
            className="bg-gradient-to-br from-teal-mist via-sky-mist/70 to-sand"
          >
            <SectionHeading
              eyebrow={<Eyebrow index="02">Your path</Eyebrow>}
              title={
                <span id="units-title">
                  <SplitWords text={code === 'C' ? 'Sample unit' : 'Units and stages'} />
                </span>
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
          </Band>

          {code === 'B' ? (
            <Band side="b" dark className="qt-grain bg-grad-night">
              <PersonalisedPaths paths={data.paths} />
            </Band>
          ) : null}

          <Band
            side={code === 'B' ? 'a' : 'b'}
            labelledBy="rules-title"
            className="bg-gradient-to-b from-rose-mist/70 via-sand to-sand-deep"
          >
            <SectionHeading
              eyebrow={
                <Eyebrow index="03" tone="maroon">
                  Completion
                </Eyebrow>
              }
              title={
                <span id="rules-title">
                  <SplitWords text="Completion rules" />
                </span>
              }
            />
            <CompletionRules programme={data} />
          </Band>

          {data.trainers.length > 0 ? (
            <Band side="a" dark labelledBy="trainers-title" className="qt-grain bg-grad-night">
              <SectionHeading
                tone="light"
                eyebrow={
                  <Eyebrow index="04" tone="light">
                    The people behind it
                  </Eyebrow>
                }
                title={
                  <span id="trainers-title">
                    <SplitWords text="Trainers" />
                  </span>
                }
                description={
                  code === 'B'
                    ? 'Optional clinics are available with these trainers. They are never required for Program B.'
                    : 'Fictional trainers approved for this programme.'
                }
              />
              <ul
                aria-label="Trainers"
                className="-mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 pt-2 pb-6 md:-mx-8 md:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {data.trainers.map((trainer, index) => (
                  <li key={trainer.code} data-reveal="card" className="w-64 shrink-0 snap-start">
                    <TrainerCard
                      trainer={{ ...trainer, programmes: [code] }}
                      showcase
                      tone={TRAINER_TONES[index % TRAINER_TONES.length]}
                    />
                  </li>
                ))}
              </ul>
            </Band>
          ) : null}

          {data.upcomingSessions.length > 0 ? (
            <Band
              side="b"
              labelledBy="programme-sessions-title"
              className="bg-gradient-to-b from-sky-mist via-sand to-teal-mist/60"
            >
              <SectionHeading
                eyebrow={<Eyebrow index="05">Live learning</Eyebrow>}
                title={
                  <span id="programme-sessions-title">
                    <SplitWords text="Upcoming sessions" />
                  </span>
                }
              />
              <div className="grid gap-6 lg:grid-cols-2">
                {data.upcomingSessions.slice(0, 4).map((session, index) => {
                  const ticket = ticketTone(index)
                  return (
                    <div key={session.id} data-reveal="card">
                      <SessionTicket
                        session={session}
                        accent={ticket.accent}
                        action={<BookAction full={session.seatsRemaining === 0} />}
                        className={cn(SHOWCASE_TICKET, ticket.wash)}
                      />
                    </div>
                  )
                })}
              </div>
            </Band>
          ) : null}

          {code !== 'C' ? (
            <section className="px-4 py-16 md:px-8 md:py-20">
              <div className="relative isolate mx-auto max-w-[1400px] overflow-hidden rounded-[2rem] text-white shadow-xl">
                <Parallax speed={10} className="absolute -inset-y-24 inset-x-0 -z-30">
                  <img
                    src={copy.heroImage}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover"
                  />
                </Parallax>
                <div
                  aria-hidden
                  className={cn(
                    'absolute inset-0 -z-20 bg-gradient-to-r rtl:bg-gradient-to-l',
                    tone.heroWash,
                  )}
                />
                <CornerPattern side="b" tone="dark" />
                <ScrollReveal className="flex min-h-[380px] max-w-2xl flex-col justify-center gap-7 p-8 md:p-14">
                  <p
                    data-reveal
                    className="font-display font-light text-3xl leading-snug md:text-5xl"
                  >
                    {code === 'A'
                      ? 'Ready for a structured, certified route? Any Program B progress stays exactly as it is.'
                      : 'Start with a short profile and a five-question baseline.'}
                  </p>
                  <div data-reveal>
                    <Button
                      asChild
                      size="lg"
                      className="h-14 w-fit bg-white px-8 text-base text-teal-deep shadow-lg hover:bg-gold-soft hover:text-teal-night"
                    >
                      <Link to={cta.to as never} params={cta.params as never}>
                        {cta.label}
                      </Link>
                    </Button>
                  </div>
                </ScrollReveal>
              </div>
            </section>
          ) : null}
        </>
      )}
    </PublicLayout>
  )
}
