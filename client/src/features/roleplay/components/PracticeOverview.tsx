import { useQuery } from '@tanstack/react-query'
import { Award, History, MessagesSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { StatCard } from '@/components/data/StatCard'
import { DemoBadge } from '@/components/layout/DemoBadge'
import { PageHeader } from '@/components/layout/PageHeader'
import { SimulatedTag } from '@/components/layout/SimulatedTag'
import { Reveal, Stagger, StaggerItem } from '@/components/motion/Reveal'
import { Skeleton } from '@/components/ui/skeleton'
import { tr } from '@/i18n/localised'
import { qatarDateTime } from '@/lib/format/qatar-time'
import '../utils/arabic-copy'
import { practiceAttemptsQuery, practiceOverviewQuery } from '../queries/roleplay.queries'
import { AttemptHistory } from './AttemptHistory'
import { LoadError } from './LoadError'
import { ScenarioCard } from './ScenarioCard'

/** AI practice home: the four scenarios, best and latest scores, and recent attempts. */
export function PracticeOverview() {
  const { t, i18n } = useTranslation('learner')
  const overview = useQuery(practiceOverviewQuery())
  const attempts = useQuery(practiceAttemptsQuery())

  const header = (
    <PageHeader
      image="practice"
      title={t('roleplay.overview.title')}
      description={t('roleplay.overview.description')}
      actions={
        <SimulatedTag label={tr(overview.data?.label ?? 'Simulated AI practice', i18n.language)} />
      }
    />
  )

  if (overview.isError) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <LoadError what={t('roleplay.overview.loadWhat')} onRetry={() => overview.refetch()} />
      </div>
    )
  }

  const summary = overview.data?.summary
  return (
    <div className="flex flex-col gap-8">
      {header}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard
          label={t('roleplay.overview.statScored')}
          value={summary?.attempts ?? 0}
          icon={MessagesSquare}
          isLoading={overview.isPending}
          description={t('roleplay.overview.statScoredNote')}
          className="col-span-2 lg:col-span-1"
        />
        <StatCard
          label={t('roleplay.overview.statBest')}
          value={summary?.best ? summary.best.percent : <NotYet />}
          suffix="/100"
          icon={Award}
          tone="maroon"
          isLoading={overview.isPending}
          description={
            summary?.best
              ? qatarDateTime(summary.best.completedAt)
              : t('roleplay.overview.completeOne')
          }
        />
        <StatCard
          label={t('roleplay.overview.statLatest')}
          value={summary?.latest ? summary.latest.percent : <NotYet />}
          suffix="/100"
          icon={History}
          tone="neutral"
          isLoading={overview.isPending}
          description={
            summary?.latest
              ? qatarDateTime(summary.latest.completedAt)
              : t('roleplay.overview.completeOne')
          }
        />
      </div>

      <section aria-labelledby="scenarios-heading" className="flex flex-col gap-4">
        <h2 id="scenarios-heading" className="font-display text-2xl font-light text-ink">
          {t('roleplay.overview.chooseTitle')}
        </h2>
        {overview.isPending ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-56 rounded-xl" />
            ))}
          </div>
        ) : (
          <Stagger className="grid gap-5 lg:grid-cols-2">
            {overview.data.scenarios.map((scenario) => (
              <StaggerItem key={scenario.key} className="h-full">
                <ScenarioCard scenario={scenario} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </section>

      <Reveal className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section
          aria-labelledby="history-heading"
          className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-xs"
        >
          <h2 id="history-heading" className="font-display text-xl font-light text-ink">
            {t('roleplay.overview.attemptsTitle')}
          </h2>
          {attempts.isPending ? (
            <div className="grid gap-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : attempts.isError ? (
            <LoadError
              what={t('roleplay.overview.attemptsLoadWhat')}
              onRetry={() => attempts.refetch()}
            />
          ) : (
            <AttemptHistory
              attempts={attempts.data.items.slice(0, 6)}
              bestId={attempts.data.summary.best?.id}
              latestId={attempts.data.summary.latest?.id}
            />
          )}
        </section>
        <aside className="flex flex-col gap-4 rounded-xl bg-teal-deep p-6 text-white">
          <h2 className="font-display text-xl font-light">{t('roleplay.overview.howTitle')}</h2>
          <p className="text-sm leading-relaxed text-white/85">{t('roleplay.overview.howBody1')}</p>
          <p className="text-sm leading-relaxed text-white/85">{t('roleplay.overview.howBody2')}</p>
          <DemoBadge
            compact
            className="mt-auto self-start border-white/20 bg-white/10 text-white"
          />
        </aside>
      </Reveal>
    </div>
  )
}

function NotYet() {
  const { t } = useTranslation('learner')
  return (
    <span className="font-sans text-xl text-muted-foreground">{t('roleplay.overview.notYet')}</span>
  )
}
