import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { Skeleton } from '@/components/ui/skeleton'
import { localised } from '@/i18n/localised'
import { journeyQuery, unitQuery } from '../queries/learning.queries'
import type { ProgrammeCode } from '../types'
import { CourseLayout } from './course/CourseLayout'
import { UnitAbout, UnitIntro } from './course/UnitIntro'
import { LoadError } from './LoadError'
import { UnitContent } from './units/UnitContent'
import { WithProgramme } from './WithProgramme'

/**
 * The course player (brief §5 step 4, §7–8): a course card with overall progress, the course
 * menu of every path step, and the open unit with its controls and previous and next steps.
 */
export function UnitPage({ code }: { code: string }) {
  return (
    <WithProgramme skeleton={<UnitSkeleton />}>
      {(ctx) => <UnitView code={code} programme={ctx.programme} />}
    </WithProgramme>
  )
}

export function UnitSkeleton() {
  const { t } = useTranslation('learner')
  return (
    <div
      className="flex flex-col gap-6"
      role="status"
      aria-busy="true"
      aria-label={t('learning.unit.loading')}
    >
      <Skeleton className="h-56 w-full rounded-xl" />
      <div className="grid gap-6 xl:grid-cols-[19rem_minmax(0,1fr)]">
        <Skeleton className="h-16 w-full rounded-xl xl:h-[28rem]" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-2/3 rounded-lg" />
          <Skeleton className="aspect-video w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}

function UnitView({ code, programme }: { code: string; programme: ProgrammeCode }) {
  const unit = useQuery(unitQuery(programme, code))
  const journey = useQuery(journeyQuery(programme))
  const { t, i18n } = useTranslation('learner')
  if (unit.isLoading || journey.isLoading) return <UnitSkeleton />
  if (unit.error || !unit.data) {
    return (
      <LoadError
        error={unit.error}
        onRetry={() => void unit.refetch()}
        title={t('learning.error.unitTitle')}
      />
    )
  }
  const data = localised(unit.data, i18n.language)
  const completed = data.progress.status === 'completed'
  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <Breadcrumbs
        items={[
          { label: t('learning.page.title'), to: '/learner/learning' },
          { label: `${data.code} ${data.title}` },
        ]}
      />
      {journey.data ? (
        <CourseLayout
          journey={journey.data}
          programme={programme}
          currentId={code}
          nowLabel={`${data.code} ${data.title}`}
        >
          {(meta) => (
            <article className="flex min-w-0 flex-col gap-6">
              <UnitIntro unit={data} position={meta.position} recommended={meta.recommended} />
              <UnitContent unit={data} programme={programme} completed={completed} />
              <UnitAbout unit={data} lang={i18n.language} />
              {meta.navigation}
            </article>
          )}
        </CourseLayout>
      ) : (
        <>
          <LoadError error={journey.error} onRetry={() => void journey.refetch()} />
          <article className="flex min-w-0 flex-col gap-6">
            <UnitIntro unit={data} position={null} recommended={false} />
            <UnitContent unit={data} programme={programme} completed={completed} />
            <UnitAbout unit={data} lang={i18n.language} />
          </article>
        </>
      )}
    </div>
  )
}
