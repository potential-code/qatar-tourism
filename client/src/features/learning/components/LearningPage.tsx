import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { tr } from '@/i18n/localised'
import { journeyQuery } from '../queries/learning.queries'
import { CourseLayout } from './course/CourseLayout'
import { PATH_OVERVIEW_ID } from './course/CourseMenu'
import { PathOverview } from './course/PathOverview'
import { LoadError } from './LoadError'
import { UnitSkeleton } from './UnitPage'
import { type ProgrammeContext, WithProgramme } from './WithProgramme'

/**
 * My learning (brief §5 step 4, §6): the course view opened on the path overview. The course
 * menu lists every step, required and recommended separately; each unit opens in the same
 * layout, so there is one place to follow the path.
 */
export function LearningPage() {
  return (
    <WithProgramme skeleton={<UnitSkeleton />}>{(ctx) => <Learning ctx={ctx} />}</WithProgramme>
  )
}

function Learning({ ctx }: { ctx: ProgrammeContext }) {
  const journey = useQuery(journeyQuery(ctx.programme))
  const { t, i18n } = useTranslation('learner')
  // The programme switcher lives in the portal top bar, so the course card does not repeat it.
  if (journey.isLoading) return <UnitSkeleton />
  if (journey.error || !journey.data) {
    return (
      <LoadError
        error={journey.error}
        onRetry={() => void journey.refetch()}
        title={t('learning.page.title')}
      />
    )
  }
  const data = journey.data
  const next = data.nextAction ? data.items.find((i) => i.id === data.nextAction?.itemId) : null
  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <CourseLayout
        journey={data}
        programme={ctx.programme}
        currentId={PATH_OVERVIEW_ID}
        nowLabel={
          next
            ? `${next.courseCode ? `${next.courseCode} ` : ''}${tr(next.title, i18n.language)}`
            : t('learning.course.allDoneTitle')
        }
      >
        {(meta) => <PathOverview journey={data} programme={ctx.programme} items={meta.items} />}
      </CourseLayout>
    </div>
  )
}
