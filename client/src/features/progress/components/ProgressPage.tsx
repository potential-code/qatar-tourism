import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { CornerPattern } from '@/components/brand/CornerPattern'
import { PageHeader } from '@/components/layout/PageHeader'
import { Reveal } from '@/components/motion/Reveal'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '@/features/learning/components/LoadError'
import { ProgrammeSwitcher } from '@/features/learning/components/ProgrammeSwitcher'
import { StageMap } from '@/features/learning/components/StageMap'
import { type ProgrammeContext, WithProgramme } from '@/features/learning/components/WithProgramme'
import { journeyQuery } from '@/features/learning/queries/learning.queries'
import { AttemptHistory } from './AttemptHistory'
import { CompetencyChart } from './CompetencyChart'
import { PracticeScores } from './PracticeScores'
import { ResultsOverview } from './ResultsOverview'

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
        <Skeleton className="h-44 rounded-xl lg:col-span-3" />
        <Skeleton className="h-44 rounded-xl sm:order-last sm:col-span-2 lg:order-none lg:col-span-6" />
        <Skeleton className="h-44 rounded-xl lg:col-span-3" />
      </div>
      <Skeleton className="h-80 rounded-xl" />
      <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
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
  const postLabel = ctx.programme === 'A' ? t('progress.page.final') : t('progress.page.post')

  return (
    <div className="flex flex-col gap-8">
      {header}
      <ResultsOverview journey={data} programme={ctx.programme} postLabel={postLabel} />

      {data.gates.length > 0 ? (
        <Reveal className="qt-card-elevated rounded-xl p-5 md:p-7">
          <h2 className="mb-5 font-display text-2xl font-normal text-ink">
            {t('learning.page.levelsAndStages')}
          </h2>
          <StageMap gates={data.gates} />
        </Reveal>
      ) : null}

      <Reveal className="qt-card-elevated relative isolate overflow-hidden rounded-xl p-5 md:p-7">
        <section aria-labelledby="competencies-title" className="flex flex-col gap-5">
          <CornerPattern side="b" />
          <div>
            <h2 id="competencies-title" className="font-display text-2xl font-normal text-ink">
              {t('progress.page.competencies')}
            </h2>
            <p className="text-sm text-muted-foreground">{t('progress.page.competenciesNote')}</p>
          </div>
          <CompetencyChart
            data={data.competencies}
            postLabel={postLabel}
            showFoundation={ctx.programme === 'A'}
            emptyAction={
              <Button asChild size="sm">
                <Link to="/learner/assessments" search={{ programme: ctx.programme }}>
                  {t('home.scores.view')}
                  <ArrowRight aria-hidden className="rtl:-scale-x-100" />
                </Link>
              </Button>
            }
          />
        </section>
      </Reveal>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <AttemptHistory programme={ctx.programme} />
        <PracticeScores practice={data.practice} programme={ctx.programme} />
      </div>
    </div>
  )
}
