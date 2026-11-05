import { Link } from '@tanstack/react-router'
import { ChevronDown, Compass } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { tr } from '@/i18n/localised'
import { cn } from '@/lib/utils'
import type { ProgrammeCode } from '../../types'
import type { MenuGroup } from '../../utils/courseMenu'
import { CourseMenuItem } from './CourseMenuItem'

/** Menu id of the path overview pane (My learning itself). */
export const PATH_OVERVIEW_ID = 'path-overview'

/**
 * The course menu (learning-module "Course content"): every step of the learner's path in order,
 * grouped by level and stage, with recommended items listed separately. Sticky beside the player
 * on wide screens; a disclosure above the player on narrower ones.
 */
export function CourseMenu({
  groups,
  programme,
  currentId,
}: {
  groups: readonly MenuGroup[]
  programme: ProgrammeCode
  currentId: string | null
}) {
  const { t, i18n } = useTranslation('learner')
  const [open, setOpen] = useState(false)
  const listId = useId()
  const listRef = useRef<HTMLDivElement>(null)
  // Keep the open item visible inside the scrolling menu, without moving the page.
  useEffect(() => {
    const list = listRef.current
    if (!list || currentId === null) return
    const active = list.querySelector<HTMLElement>('[aria-current="page"]')
    if (!active || list.scrollHeight <= list.clientHeight) return
    const offset = active.offsetTop - list.offsetTop
    if (
      offset + active.offsetHeight > list.scrollTop + list.clientHeight ||
      offset < list.scrollTop
    ) {
      list.scrollTop = Math.max(0, offset - list.clientHeight / 3)
    }
  }, [currentId])
  const required = groups.filter((g) => !g.recommended).flatMap((g) => g.items)
  const done = required.filter((i) => i.state === 'completed').length
  const summary = t('learning.course.menuSummary', { done, total: required.length })

  const stageLabel = (group: MenuGroup) => {
    if (group.recommended || group.stage === null) return t('learning.course.recommended')
    const stage = tr(group.stage, i18n.language)
    return programme === 'A' && group.stage !== 'Onboarding'
      ? `${t('learning.page.levelPrefix', { level: group.level })}${stage}`
      : stage
  }

  return (
    <nav
      aria-label={t('learning.course.menu')}
      className="overflow-hidden rounded-xl border border-teal/10 bg-white shadow-sm xl:sticky xl:top-20 xl:flex xl:max-h-[calc(100dvh-6rem)] xl:flex-col"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3.5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-xs font-medium tracking-[0.18em] text-maroon uppercase">
            {t('learning.course.menu')}
          </p>
          <p className="text-sm text-muted-foreground">{summary}</p>
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-teal/30 px-3 py-1.5 text-sm font-medium text-teal transition-colors hover:bg-teal-mist focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none xl:hidden"
        >
          {open ? t('learning.course.hideMenu') : t('learning.course.showMenu')}
          <ChevronDown
            aria-hidden
            className={cn('size-4 transition-transform duration-200', open && 'rotate-180')}
          />
        </button>
      </div>
      <div
        id={listId}
        ref={listRef}
        className={cn(
          'flex-col gap-4 p-2 pb-3 xl:flex xl:overflow-y-auto',
          open ? 'flex' : 'hidden',
        )}
      >
        <Link
          to="/learner/learning"
          search={{ programme }}
          aria-current={currentId === PATH_OVERVIEW_ID ? 'page' : undefined}
          className={cn(
            'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-start transition-colors duration-200 focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none',
            currentId === PATH_OVERVIEW_ID
              ? 'bg-maroon-mist/70 before:absolute before:inset-y-2 before:start-0 before:w-1 before:rounded-full before:bg-maroon'
              : 'hover:bg-teal-mist/70',
          )}
        >
          <span
            aria-hidden
            className={cn(
              'grid size-8 shrink-0 place-items-center rounded-full border',
              currentId === PATH_OVERVIEW_ID
                ? 'border-maroon bg-white text-maroon'
                : 'border-teal/30 bg-teal-mist text-teal',
            )}
          >
            <Compass className="size-4" />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span
              className={cn(
                'text-sm leading-snug font-medium',
                currentId === PATH_OVERVIEW_ID ? 'text-maroon-deep' : 'text-ink',
              )}
            >
              {t('learning.course.overview')}
            </span>
            <span className="text-xs text-muted-foreground">
              {t('learning.course.overviewHint')}
            </span>
          </span>
        </Link>
        {groups.map((group) => {
          const labelId = `${listId}-${group.key}`
          const groupDone = group.items.filter((i) => i.state === 'completed').length
          return (
            <div key={group.key} className="flex flex-col gap-1">
              <p
                id={labelId}
                className={cn(
                  'flex items-baseline justify-between gap-2 px-3 pt-2 text-xs font-medium',
                  group.recommended ? 'text-maroon-deep' : 'text-ink',
                )}
              >
                <span>{stageLabel(group)}</span>
                <span aria-hidden className="text-muted-foreground tabular-nums">
                  {groupDone}/{group.items.length}
                </span>
              </p>
              <ol aria-labelledby={labelId} className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <CourseMenuItem
                      item={item}
                      programme={programme}
                      current={item.id === currentId}
                    />
                  </li>
                ))}
              </ol>
            </div>
          )
        })}
      </div>
    </nav>
  )
}
