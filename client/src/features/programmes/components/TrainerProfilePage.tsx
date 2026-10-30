import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CalendarX, ChevronLeft, Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PhotoPanel } from '@/components/brand'
import { PersonAvatar } from '@/components/data/PersonAvatar'
import { DemoBadge } from '@/components/layout'
import { Reveal } from '@/components/motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { PublicLayout } from '@/features/public-site/components/PublicLayout'
import { SectionError } from '@/features/public-site/components/SectionState'
import { programmeSlug } from '../content'
import { trainerQuery } from '../queries/programmes.queries'
import { languagesText, programmeName } from '../utils/copy'
import { BookAction } from './BookAction'
import { SessionTicket } from './SessionTicket'

/** Public trainer profile (brief §16): bio, expertise, languages, programmes, sessions. */
export function TrainerProfilePage({ code }: { code: string }) {
  const { t } = useTranslation('public')
  const { data, isPending, isError, error, refetch } = useQuery(trainerQuery(code))
  const missing = isError && (error as { status?: number }).status === 404
  return (
    <PublicLayout overlayHeader>
      <PhotoPanel
        src="/images/official/dhow-boat-min.jpg"
        alt={t('trainer.heroAlt')}
        fade="bottom"
        priority
        className="h-72 bg-ink md:h-96"
      >
        <div className="mx-auto flex h-full max-w-[1100px] items-end px-4 pb-32 md:px-8">
          <Link
            to="/trainers"
            className="inline-flex w-fit items-center gap-1 rounded-full text-sm text-white/85 hover:text-white focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/60"
          >
            <ChevronLeft aria-hidden className="size-4 rtl:-scale-x-100" />
            {t('trainer.all')}
          </Link>
        </div>
      </PhotoPanel>
      <div className="relative z-10 mx-auto -mt-24 flex max-w-[1100px] flex-col gap-12 px-4 pb-24 md:px-8">
        {isPending ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : missing ? (
          <EmptyState
            title={t('trainer.notFound')}
            description={t('trainer.notFoundDescription')}
            action={
              <Button asChild>
                <Link to="/trainers">{t('trainer.seeAll')}</Link>
              </Button>
            }
          />
        ) : isError ? (
          <SectionError what={t('errors.trainer')} onRetry={() => refetch()} />
        ) : (
          <>
            <Reveal className="grid gap-8 rounded-xl bg-white p-6 shadow-black/10 shadow-xl ring-1 ring-ink/5 md:grid-cols-[auto_1fr] md:p-10">
              <PersonAvatar
                name={data.fullName}
                src={data.avatarPath}
                tone="teal"
                className="size-28 text-3xl"
              />
              <div className="grid gap-5">
                <div className="grid gap-1">
                  <h1 className="font-display font-light text-4xl md:text-5xl">{data.fullName}</h1>
                  <p className="text-lg text-teal-deep">{data.headline}</p>
                </div>
                <p className="max-w-[65ch] text-muted-foreground leading-relaxed">{data.bio}</p>
                <div className="flex flex-wrap gap-2">
                  {data.expertise.map((item) => (
                    <Badge key={item} variant="outline" className="border-teal/25 text-teal-deep">
                      {item}
                    </Badge>
                  ))}
                </div>
                <dl className="grid gap-4 text-sm sm:grid-cols-3">
                  <div className="grid gap-1">
                    <dt className="text-muted-foreground text-xs">{t('trainer.languages')}</dt>
                    <dd className="inline-flex items-center gap-1.5">
                      <Languages aria-hidden className="size-4 text-teal" />
                      {languagesText(t, data.languages)}
                    </dd>
                  </div>
                  <div className="grid gap-1">
                    <dt className="text-muted-foreground text-xs">{t('trainer.programmes')}</dt>
                    <dd className="flex flex-wrap gap-2">
                      {data.programmes.map((p) => (
                        <Link
                          key={p}
                          to="/programmes/$code"
                          params={{ code: programmeSlug(p) }}
                          className="text-teal-deep underline-offset-4 hover:underline"
                        >
                          {programmeName(t, p)}
                        </Link>
                      ))}
                    </dd>
                  </div>
                  <div className="grid gap-1">
                    <dt className="text-muted-foreground text-xs">{t('trainer.organisation')}</dt>
                    <dd>{data.organisation}</dd>
                  </div>
                </dl>
                <DemoBadge className="w-fit" />
              </div>
            </Reveal>
            <section aria-labelledby="trainer-sessions" className="grid gap-6">
              <h2 id="trainer-sessions" className="font-display font-light text-3xl">
                {t('trainer.upcoming', { name: data.fullName.split(' ')[0] })}
              </h2>
              {data.upcomingSessions.length === 0 ? (
                <EmptyState
                  icon={CalendarX}
                  title={t('trainer.noSessions')}
                  description={t('trainer.noSessionsDescription')}
                  action={
                    <Button asChild variant="outline">
                      <Link to="/sessions">{t('trainer.allSessions')}</Link>
                    </Button>
                  }
                />
              ) : (
                <div className="grid gap-4">
                  {data.upcomingSessions.map((session) => (
                    <SessionTicket
                      key={session.id}
                      session={session}
                      action={<BookAction full={session.seatsRemaining === 0} />}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </PublicLayout>
  )
}
