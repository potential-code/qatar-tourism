import { type ReactNode, useMemo } from 'react'
import type { Journey, ProgrammeCode } from '../../types'
import { buildCourseMenu, findUnit, flattenMenu, type MenuItem } from '../../utils/courseMenu'
import { CourseHeader } from './CourseHeader'
import { CourseMenu, PATH_OVERVIEW_ID } from './CourseMenu'
import { StepNavigation } from './StepNavigation'

export type CourseLayoutMeta = {
  items: readonly MenuItem[]
  current: MenuItem | undefined
  position: { n: number; total: number } | null
  recommended: boolean
  navigation: ReactNode
}

/**
 * The course view (learning-module course player): the course card with overall progress on
 * top, the course menu beside the main pane below it. My learning opens it on the path
 * overview; each unit opens it on that unit, so the learner never leaves one layout.
 */
export function CourseLayout({
  journey,
  programme,
  currentId,
  nowLabel,
  headerActions,
  headingLevel,
  children,
}: {
  journey: Journey
  programme: ProgrammeCode
  /** The open unit's code, or PATH_OVERVIEW_ID for the overview pane. */
  currentId: string
  nowLabel: string
  headerActions?: ReactNode
  headingLevel?: 'h1' | 'p'
  children: (meta: CourseLayoutMeta) => ReactNode
}) {
  const groups = useMemo(() => buildCourseMenu(journey), [journey])
  const items = useMemo(() => flattenMenu(groups), [groups])
  const current = currentId === PATH_OVERVIEW_ID ? undefined : findUnit(items, currentId)
  const index = current ? items.indexOf(current) : -1
  const unitCount = groups
    .filter((g) => !g.recommended)
    .flatMap((g) => g.items)
    .filter((i) => i.kind === 'course').length
  return (
    <>
      <CourseHeader
        journey={journey}
        programme={programme}
        unitCount={unitCount}
        nowLabel={nowLabel}
        actions={headerActions}
        headingLevel={headingLevel}
      />
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[19rem_minmax(0,1fr)] xl:gap-8">
        <CourseMenu
          groups={groups}
          programme={programme}
          currentId={current?.id ?? (currentId === PATH_OVERVIEW_ID ? PATH_OVERVIEW_ID : null)}
        />
        {children({
          items,
          current,
          position: index >= 0 ? { n: index + 1, total: items.length } : null,
          recommended: current ? !current.required : false,
          navigation:
            index >= 0 ? (
              <StepNavigation items={items} currentIndex={index} programme={programme} />
            ) : null,
        })}
      </div>
    </>
  )
}
