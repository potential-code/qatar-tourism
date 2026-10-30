import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, CalendarX } from 'lucide-react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { CornerPattern, Eyebrow, SectionHeading } from '@/components/brand'
import { ScrollReveal, SplitWords } from '@/components/motion'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { BookAction } from '@/features/programmes/components/BookAction'
import { SessionTicket, ticketTone } from '@/features/programmes/components/SessionTicket'
import { TrainerCard, type TrainerTone } from '@/features/programmes/components/TrainerCard'
import {
  trainersQuery,
  upcomingSessionsQuery,
} from '@/features/programmes/queries/programmes.queries'
import { cn } from '@/lib/utils'
import { SectionError } from './SectionState'

const TRAINER_TONES: TrainerTone[] = ['teal', 'maroon', 'sky', 'gold']

/** Sessions and trainers (brief §2, §16): real seeded upcoming sessions and trainer profiles. */
export function SessionsAndTrainers() {
  const { t } = useTranslation('public')
  const sessions = useQuery(upcomingSessionsQuery())
  const trainers = useQuery(trainersQuery())
  const strip = useRef<HTMLUListElement>(null)

  function page(direction: 1 | -1) {
    const el = strip.current
    if (!el) return
    const rtl = getComputedStyle(el).direction === 'rtl'
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollBy({
      left: direction * (rtl ? -1 : 1) * el.clientWidth * 0.8,
      behavior: reduce ? 'auto' : 'smooth',
    })
  }

  return (
    <section id="sessions" aria-labelledby="sessions-title" className="scroll-mt-20">
      <div className="relative isolate overflow-hidden bg-gradient-to-b from-sky-mist via-sand to-teal-mist/60">
        <CornerPattern side="a" />
        <div
          aria-hidden
          className="absolute top-1/3 -start-32 -z-10 size-[420px] qt-glow text-gold/25"
        />
        <ScrollReveal className="mx-auto flex max-w-[1400px] flex-col gap-14 px-4 py-24 md:px-8 md:py-32">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <SectionHeading
              eyebrow={
                <Eyebrow className="rtl:tracking-normal" index="04">
                  {t('sessionsSection.eyebrow')}
                </Eyebrow>
              }
              title={
                <span id="sessions-title" className="rtl:leading-[1.4]">
                  <SplitWords text={t('sessionsSection.title')} />
                </span>
              }
              description={t('sessionsSection.description')}
            />
            <div data-reveal>
              <Button asChild variant="outline" className="group w-fit shrink-0 bg-white/80">
                <Link to="/sessions">
                  {t('sessionsSection.viewAll')}
                  <ArrowRight
                    aria-hidden
                    className="transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1"
                  />
                </Link>
              </Button>
            </div>
          </div>

          {sessions.isPending ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-56 rounded-2xl" />
              ))}
            </div>
          ) : sessions.isError ? (
            <SectionError what={t('errors.sessions')} onRetry={() => sessions.refetch()} />
          ) : sessions.data.length === 0 ? (
            <EmptyState
              icon={CalendarX}
              title={t('sessionsSection.emptyTitle')}
              description={t('sessionsSection.emptyDescription')}
              action={
                <Button asChild>
                  <Link to="/programmes">{t('sessionsSection.explore')}</Link>
                </Button>
              }
            />
          ) : (
            <ScrollReveal className="grid gap-6 lg:grid-cols-2">
              {sessions.data.slice(0, 4).map((session, index) => {
                const ticket = ticketTone(index)
                return (
                  <div key={session.id} data-reveal="card">
                    <SessionTicket
                      session={session}
                      accent={ticket.accent}
                      action={<BookAction full={session.seatsRemaining === 0} />}
                      className={cn(
                        'group h-full rounded-2xl shadow-card ring-1 ring-ink/5 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-2 motion-reduce:hover:transform-none',
                        ticket.wash,
                      )}
                    />
                  </div>
                )
              })}
            </ScrollReveal>
          )}
        </ScrollReveal>
      </div>

      <div className="qt-grain relative isolate overflow-hidden bg-grad-night text-white">
        <CornerPattern side="b" tone="dark" />
        <div
          aria-hidden
          className="absolute -top-40 end-1/4 -z-10 size-[480px] qt-glow text-sky/25"
        />
        <ScrollReveal className="mx-auto flex max-w-[1400px] flex-col gap-10 px-4 py-20 md:px-8 md:py-24">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="grid gap-3">
              <div data-reveal>
                <Eyebrow className="rtl:tracking-normal" tone="light">
                  {t('sessionsSection.trainersEyebrow')}
                </Eyebrow>
              </div>
              <h3 className="font-display font-light text-4xl md:text-5xl">
                <SplitWords text={t('sessionsSection.trainersTitle')} />
              </h3>
            </div>
            <div data-reveal className="flex items-center gap-3">
              <Link
                to="/trainers"
                className="me-2 font-medium text-gold-soft text-sm underline-offset-4 hover:underline"
              >
                {t('sessionsSection.allTrainers')}
              </Link>
              <Button
                variant="glass"
                size="icon"
                aria-label={t('sessionsSection.previous')}
                onClick={() => page(-1)}
                className="hidden md:inline-flex"
              >
                <ArrowLeft aria-hidden className="rtl:-scale-x-100" />
              </Button>
              <Button
                size="icon"
                aria-label={t('sessionsSection.next')}
                onClick={() => page(1)}
                className="hidden bg-white text-teal-deep hover:bg-gold-soft md:inline-flex"
              >
                <ArrowRight aria-hidden className="rtl:-scale-x-100" />
              </Button>
            </div>
          </div>
          {trainers.isPending ? (
            <div className="flex gap-5 overflow-hidden">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-96 w-64 shrink-0 rounded-[1.75rem] bg-white/10" />
              ))}
            </div>
          ) : trainers.isError ? (
            <SectionError what={t('errors.trainerProfiles')} onRetry={() => trainers.refetch()} />
          ) : (
            <ScrollReveal>
              <ul
                ref={strip}
                aria-label={t('sessionsSection.list')}
                className="-mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-4 pt-4 pb-10 md:-mx-8 md:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {trainers.data.map((trainer, index) => (
                  <li key={trainer.code} data-reveal="card" className="w-64 shrink-0 snap-start">
                    <TrainerCard
                      trainer={trainer}
                      showcase
                      tone={TRAINER_TONES[index % TRAINER_TONES.length]}
                    />
                  </li>
                ))}
              </ul>
            </ScrollReveal>
          )}
        </ScrollReveal>
      </div>
    </section>
  )
}
