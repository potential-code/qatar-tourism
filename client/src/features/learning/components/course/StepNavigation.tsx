import { Link } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { tr } from '@/i18n/localised'
import { cn } from '@/lib/utils'
import type { ProgrammeCode } from '../../types'
import type { MenuItem } from '../../utils/courseMenu'
import { itemLink } from '../../utils/itemLink'
import { useItemTypeLabel } from './useItemTypeLabel'

/** Previous and next steps along the course menu, plus the way back to the path. */
export function StepNavigation({
  items,
  currentIndex,
  programme,
}: {
  items: readonly MenuItem[]
  currentIndex: number
  programme: ProgrammeCode
}) {
  const { t } = useTranslation('learner')
  const prev = currentIndex > 0 ? items[currentIndex - 1] : undefined
  const next = currentIndex >= 0 ? items[currentIndex + 1] : undefined
  return (
    <nav aria-label={t('learning.unit.navAria')} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {prev ? (
          <StepLink item={prev} programme={programme} direction="previous" />
        ) : (
          <span className="hidden sm:block" />
        )}
        {next ? <StepLink item={next} programme={programme} direction="next" /> : null}
      </div>
      <Link
        to="/learner/learning"
        search={{ programme }}
        className="self-start rounded-full px-1 text-sm font-medium text-teal hover:underline focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
      >
        {t('learning.unit.back')}
      </Link>
    </nav>
  )
}

function StepLink({
  item,
  programme,
  direction,
}: {
  item: MenuItem
  programme: ProgrammeCode
  direction: 'previous' | 'next'
}) {
  const { t, i18n } = useTranslation('learner')
  const typeLabel = useItemTypeLabel(item)
  const isNext = direction === 'next'
  const locked = item.state === 'locked'
  const Arrow = isNext ? ArrowRight : ArrowLeft
  const inner: ReactNode = (
    <>
      {isNext ? null : <Arrow aria-hidden className="size-4 shrink-0 text-teal rtl:-scale-x-100" />}
      <span className={cn('flex min-w-0 flex-1 flex-col gap-0.5', isNext && 'items-end text-end')}>
        <span className="text-xs text-muted-foreground">
          {isNext ? t('learning.unit.next') : t('learning.unit.previous')} · {typeLabel}
        </span>
        <span className="truncate font-medium text-ink">{tr(item.title, i18n.language)}</span>
        {locked ? (
          <span className="text-xs text-muted-foreground">{t('learning.course.lockedNext')}</span>
        ) : null}
      </span>
      {isNext ? (
        locked ? (
          <Lock aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <Arrow
            aria-hidden
            className="size-4 shrink-0 text-teal transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1"
          />
        )
      ) : null}
    </>
  )
  const base =
    'group flex min-w-0 items-center gap-3 rounded-xl border bg-white px-4 py-3 text-sm shadow-xs transition-[border-color,box-shadow] duration-200'
  if (locked) {
    return (
      <div className={cn(base, 'bg-white/60')} aria-disabled="true">
        {inner}
      </div>
    )
  }
  const link = itemLink(item, programme)
  return (
    <Link
      to={link.to as never}
      search={link.search as never}
      className={cn(
        base,
        'hover:border-teal/40 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none',
      )}
    >
      {inner}
    </Link>
  )
}
