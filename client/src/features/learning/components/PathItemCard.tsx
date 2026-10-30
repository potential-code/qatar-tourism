import { Link } from '@tanstack/react-router'
import { ArrowRight, Check, Lock } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { SimulatedTag } from '@/components/layout/SimulatedTag'
import { spring } from '@/components/motion/variants'
import { tr } from '@/i18n/localised'
import { cn } from '@/lib/utils'
import type { JourneyItem, ProgrammeCode } from '../types'
import { minutesLabel } from '../utils/format'
import { UNIT_IMAGE } from '../utils/imagery'
import { itemLink, KIND_KEY } from '../utils/itemLink'
import { ItemIcon } from './ItemIcon'

const STATE_KEY = {
  completed: 'learning.state.completed',
  in_progress: 'learning.state.inProgress',
  available: 'learning.state.available',
  locked: 'learning.state.locked',
} as const satisfies Record<JourneyItem['state'], string>

/** One step of the path: what it is, its state in words and an icon, and where it opens. */
export function PathItemCard({
  item,
  programme,
  recommended = false,
  compact = false,
  index,
}: {
  item: Pick<
    JourneyItem,
    | 'id'
    | 'kind'
    | 'courseCode'
    | 'scenarioKey'
    | 'title'
    | 'state'
    | 'lockReason'
    | 'estimatedMinutes'
  > & {
    unit?: JourneyItem['unit']
  }
  programme: ProgrammeCode
  recommended?: boolean
  /** Narrow columns: the state reads as text under the title instead of a pill. */
  compact?: boolean
  index?: number
}) {
  const reduce = useReducedMotion()
  const { t, i18n } = useTranslation('learner')
  const stateLabel = t(STATE_KEY[item.state])
  const kindKey = KIND_KEY[item.kind as keyof typeof KIND_KEY] ?? 'learning.kind.fallback'
  const link = itemLink(item, programme)
  const locked = item.state === 'locked'
  const image = item.courseCode ? UNIT_IMAGE[item.courseCode] : undefined
  const percent = item.unit?.percent ?? (item.state === 'completed' ? 100 : 0)

  const body = (
    <>
      <div
        className={cn(
          'relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg',
          !compact && 'sm:size-20',
          image ? 'bg-sand-deep' : 'bg-teal-mist',
        )}
      >
        {image ? (
          <img
            src={image}
            alt=""
            loading="lazy"
            className={cn('absolute inset-0 size-full object-cover', locked && 'grayscale')}
          />
        ) : (
          <ItemIcon kind={item.kind} courseCode={item.courseCode} className="size-6 text-teal" />
        )}
        {item.state === 'completed' ? (
          <span className="absolute inset-0 grid place-items-center bg-teal/70 text-white">
            <Check aria-hidden className="size-6" />
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {index !== undefined ? (
            <span className="tabular-nums">{t('learning.card.step', { n: index })}</span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <ItemIcon kind={item.kind} courseCode={item.courseCode} className="size-3.5" />
            {item.courseCode ? `${item.courseCode} · ` : ''}
            {t(kindKey)}
          </span>
          <span>{minutesLabel(item.estimatedMinutes)}</span>
          {recommended ? (
            <span className="rounded-full bg-maroon-mist px-2 py-0.5 font-medium text-maroon-deep">
              {t('learning.card.recommended')}
            </span>
          ) : null}
          {item.kind === 'ai_practice' ? (
            <SimulatedTag label={t('learning.card.simulatedAi')} />
          ) : null}
        </div>
        <p className={cn('font-medium text-ink', compact ? 'leading-snug' : 'truncate')}>
          {tr(item.title, i18n.language)}
        </p>
        {compact ? (
          <p aria-hidden className="text-xs text-muted-foreground">
            {stateLabel}
          </p>
        ) : null}
        {locked && item.lockReason ? (
          <p className="text-xs text-muted-foreground">{tr(item.lockReason, i18n.language)}</p>
        ) : item.state === 'in_progress' && percent > 0 ? (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-teal-mist">
              <div className="h-full rounded-full bg-teal" style={{ width: `${percent}%` }} />
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">{percent}%</span>
          </div>
        ) : null}
      </div>
      <div className={cn('hidden shrink-0 items-center gap-3', !compact && 'sm:flex')}>
        {/* Visual pill only: the state is announced once, by the sr-only text below. */}
        <span
          aria-hidden
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
            item.state === 'completed' && 'bg-teal-mist text-teal-deep',
            item.state === 'in_progress' && 'bg-maroon-mist text-maroon-deep',
            item.state === 'available' && 'bg-sand-deep text-ink',
            locked && 'bg-sand-deep text-muted-foreground',
          )}
        >
          {locked ? <Lock aria-hidden className="size-3" /> : null}
          {stateLabel}
        </span>
        {locked ? null : (
          <ArrowRight
            aria-hidden
            className="size-4 text-teal transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1"
          />
        )}
      </div>
      <span className="sr-only">, {stateLabel}</span>
    </>
  )

  const className =
    'group flex items-center gap-4 rounded-xl border bg-white p-3 pe-4 text-start shadow-xs transition-colors duration-200 sm:p-4'

  if (locked) {
    return (
      <div className={cn(className, 'bg-white/60')} aria-disabled="true">
        {body}
      </div>
    )
  }
  return (
    <motion.div
      whileHover={reduce ? undefined : { y: -2 }}
      whileTap={reduce ? undefined : { scale: 0.995 }}
      transition={spring}
    >
      <Link
        to={link.to as never}
        search={link.search as never}
        className={cn(
          className,
          'hover:border-teal/40 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none',
        )}
      >
        {body}
      </Link>
    </motion.div>
  )
}
