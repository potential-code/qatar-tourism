import { useQuery } from '@tanstack/react-query'
import { CalendarCheck, Gauge, MessagesSquare, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { StatCard } from '@/components/data/StatCard'
import { PageHeader } from '@/components/layout/PageHeader'
import { Reveal } from '@/components/motion/Reveal'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '@/features/learning/components/LoadError'
import { ProgrammeSwitcher } from '@/features/learning/components/ProgrammeSwitcher'
import { StageMap } from '@/features/learning/components/StageMap'
import { type ProgrammeContext, WithProgramme } from '@/features/learning/components/WithProgramme'
import { journeyQuery } from '@/features/learning/queries/learning.queries'
import { minutesLabel } from '@/features/learning/utils/format'
import { AttemptHistory } from './AttemptHistory'
import { CompetencyChart } from './CompetencyChart'
import { PracticeScores } from './PracticeScores'

/** Progress (brief §5, §9): competencies, attempt history, practice tracked separately. */
export function ProgressPage() {
  return (
    <WithProgramme skeleton={<ProgressSkeleton />}>{(ctx) => <Progress ctx={ctx} />}</WithProgramme>
  )
}

function ProgressSkeleton() {
  const { t } = useTranslation('learner')
  return (
    <div
      className="flex flex-col gap-6"
      role="status"
      aria-busy="true"
      aria-label={t('progress.page.loading')}
    >
      <Skeleton className="h-14 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {['s1', 's2', 's3', 's4'].map((key) => (
          <Skeleton key={key} className="h-32 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  )
}

function Progress({ ctx }: { ctx: ProgrammeContext }) {
  const journey = useQuery(journeyQuery(ctx.programme))
  const { t } = useTranslation('learner')
  const header = (
    <PageHeader
      image="progress"
      title={t('progress.page.title')}
      description={t('progress.page.description')}
      actions={
        <ProgrammeSwitcher
          enrolments={ctx.enrolments}
          value={ctx.programme}
          onChange={ctx.setProgramme}
        />
      }
    />
  )
  if (journey.isLoading) return <ProgressSkeleton />
  if (journey.error || !journey.data) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <LoadError error={journey.error} onRetry={() => void journey.refetch()} />
      </div>
    )
  }
  const data = journey.data
  const { baseline, post, gainPoints } = data.assessments
  const postLabel = ctx.programme === 'A' ? t('progress.page.final') : t('progress.page.post')

  return (
    <div className="flex flex-col gap-8">
      {header}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t('progress.page.programmeProgress')}
          value={data.enrolment.progressPercent}
          suffix="%"
          icon={Gauge}
          description={
            data.remainingMinutes > 0
              ? t('progress.page.remaining', { time: minutesLabel(data.remainingMinutes) })
              : t('progress.page.allDone')
          }
        />
        <StatCard
          label={t('progress.page.baseline')}
          value={
            baseline ? (
              baseline.score
            ) : (
              <span className="text-2xl text-muted-foreground">{t('progress.page.none')}</span>
            )
          }
          suffix={baseline ? '%' : undefined}
          icon={TrendingUp}
          tone="neutral"
        />
        <StatCard
          label={postLabel}
          value={
            post ? (
              post.score
            ) : (
              <span className="text-2xl text-muted-foreground">{t('progress.page.notYet')}</span>
            )
          }
          suffix={post ? '%' : undefined}
          icon={TrendingUp}
          delta={
            gainPoints !== null
              ? {
                  value: t('progress.page.points', {
                    sign: gainPoints >= 0 ? '+' : '',
                    n: gainPoints,
                  }),
                  direction: gainPoints > 0 ? 'up' : gainPoints < 0 ? 'down' : 'flat',
                }
              : undefined
          }
        />
        {ctx.programme === 'A' ? (
          <StatCard
            label={t('progress.page.sessionScore')}
            value={
              data.session.bestFinalScore ?? (
                <span className="text-2xl text-muted-foreground">{t('progress.page.notYet')}</span>
              )
            }
            suffix={data.session.bestFinalScore !== null ? '/100' : undefined}
            icon={CalendarCheck}
            tone="maroon"
            description={t('progress.page.sessionNote')}
          />
        ) : (
          <StatCard
            label={t('progress.page.practiceBest')}
            value={
              data.practice.best ?? (
                <span className="text-2xl text-muted-foreground">{t('progress.page.noneYet')}</span>
              )
            }
            suffix={data.practice.best !== null ? '/100' : undefined}
            icon={MessagesSquare}
            tone="maroon"
            description={t('progress.page.practiceNote')}
          />
        )}
      </div>

      {data.gates.length > 0 ? (
        <Reveal className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-5 font-display text-2xl font-normal text-ink">
            {t('learning.page.levelsAndStages')}
          </h2>
          <StageMap gates={data.gates} />
        </Reveal>
      ) : null}

      <Reveal className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="font-display text-2xl font-normal text-ink">
          {t('progress.page.competencies')}
        </h2>
        <p className="mb-5 text-sm text-muted-foreground">{t('progress.page.competenciesNote')}</p>
        <CompetencyChart
          data={data.competencies}
          postLabel={postLabel}
          showFoundation={ctx.programme === 'A'}
        />
      </Reveal>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <AttemptHistory programme={ctx.programme} />
        <PracticeScores practice={data.practice} programme={ctx.programme} />
      </div>
    </div>
  )
}
