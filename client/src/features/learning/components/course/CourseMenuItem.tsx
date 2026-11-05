import { Link } from '@tanstack/react-router'
import { Check, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { tr } from '@/i18n/localised'
import { cn } from '@/lib/utils'
import type { ProgrammeCode } from '../../types'
import type { MenuItem } from '../../utils/courseMenu'
import { minutesLabel } from '../../utils/format'
import { itemLink } from '../../utils/itemLink'
import { ItemIcon } from '../ItemIcon'
import { useItemTypeLabel } from './useItemTypeLabel'

const STATE_KEY = {
  completed: 'learning.state.completed',
  in_progress: 'learning.state.inProgress',
  available: 'learning.state.available',
  locked: 'learning.state.locked',
} as const satisfies Record<MenuItem['state'], string>

/** One row of the course menu: icon and state marker, type label, title, and its link. */
export function CourseMenuItem({
  item,
  programme,
  current,
}: {
  item: MenuItem
  programme: ProgrammeCode
  current: boolean
}) {
  const { t, i18n } = useTranslation('learner')
  const typeLabel = useItemTypeLabel(item)
  const locked = item.state === 'locked' && !current
  const done = item.state === 'completed'
  const stateLabel = current ? t('learning.course.current') : t(STATE_KEY[item.state])

  const body = (
    <>
      <span
        aria-hidden
        className={cn(
          'grid size-8 shrink-0 place-items-center rounded-full border transition-colors',
          done && 'border-teal bg-teal text-white',
          current && !done && 'border-maroon bg-white text-maroon',
          locked && 'border-border bg-sand-deep text-muted-foreground',
          !done && !current && !locked && 'border-teal/30 bg-teal-mist text-teal',
        )}
      >
        {done ? (
          <Check className="size-4" />
        ) : locked ? (
          <Lock className="size-3.5" />
        ) : (
          <ItemIcon kind={item.kind} courseCode={item.courseCode} className="size-4" />
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={cn(
            'text-[0.6875rem] font-medium tracking-[0.14em] uppercase',
            current ? 'text-maroon' : 'text-muted-foreground',
          )}
        >
          {typeLabel}
        </span>
        <span
          className={cn(
            'text-sm leading-snug font-medium',
            current ? 'text-maroon-deep' : locked ? 'text-muted-foreground' : 'text-ink',
          )}
        >
          {tr(item.title, i18n.language)}
        </span>
        <span className="text-xs text-muted-foreground">
          {minutesLabel(item.estimatedMinutes)}
          {current || item.state === 'in_progress' ? ` · ${stateLabel}` : null}
        </span>
      </span>
      <span className="sr-only">
        , {stateLabel}
        {locked && item.lockReason ? `. ${tr(item.lockReason, i18n.language)}` : ''}
      </span>
    </>
  )

  const row = cn(
    'relative flex items-start gap-3 rounded-lg px-3 py-2.5 text-start transition-colors duration-200',
    current &&
      'bg-maroon-mist/70 before:absolute before:inset-y-2 before:start-0 before:w-1 before:rounded-full before:bg-maroon',
  )

  if (locked) {
    return (
      <div className={cn(row, 'cursor-not-allowed')} aria-disabled="true">
        {body}
      </div>
    )
  }
  const link = itemLink(item, programme)
  return (
    <Link
      to={link.to as never}
      search={link.search as never}
      aria-current={current ? 'page' : undefined}
      className={cn(
        row,
        !current && 'hover:bg-teal-mist/70',
        'focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none',
      )}
    >
      {body}
    </Link>
  )
}
