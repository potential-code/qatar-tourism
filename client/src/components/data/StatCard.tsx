import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import type { ComponentType, ReactNode } from 'react'
import { CountUp } from '@/components/motion/CountUp'
import { spring } from '@/components/motion/variants'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

type Direction = 'up' | 'down' | 'flat'

export interface StatCardProps {
  label: ReactNode
  /** Numbers animate up on first view; pass a node for pre-formatted values. */
  value: number | ReactNode
  suffix?: string
  decimals?: number
  icon?: ComponentType<{ className?: string }>
  delta?: { value: ReactNode; direction: Direction; srLabel?: string }
  description?: ReactNode
  isLoading?: boolean
  /** Makes the whole card a button (e.g. KPI → filtered report, brief §12). */
  onClick?: () => void
  /** Solid brand grounds. Text is white on teal, maroon and night; teal-night on sky and gold (AA). */
  tone?: 'teal' | 'maroon' | 'neutral' | 'sky' | 'gold' | 'night'
  className?: string
}

const deltaIcon = { up: ArrowUpRight, down: ArrowDownRight, flat: Minus }
const deltaToneSolid = { up: 'text-white', down: 'text-white', flat: 'text-white/85' }
const toneSurface = {
  teal: 'bg-grad-teal text-white',
  maroon: 'bg-grad-maroon text-white',
  neutral: 'bg-teal-deep text-white',
  night: 'bg-grad-night text-white',
  sky: 'bg-sky text-teal-night',
  gold: 'bg-gold text-teal-night',
} as const
const LIGHT_TONES = ['sky', 'gold']

/** Key-figure tile with count-up value and an accent rule. Lifts on hover when clickable. */
export function StatCard({
  label,
  value,
  suffix,
  decimals,
  icon: Icon,
  delta,
  description,
  isLoading,
  onClick,
  tone = 'teal',
  className,
}: StatCardProps) {
  const reduce = useReducedMotion()
  const DeltaIcon = delta ? deltaIcon[delta.direction] : null
  const interactive = Boolean(onClick)
  const onLight = LIGHT_TONES.includes(tone)
  const solidDelta = onLight ? 'text-teal-night' : null
  const Comp = interactive ? motion.button : motion.div

  return (
    <Comp
      type={interactive ? 'button' : undefined}
      onClick={onClick}
      whileHover={interactive && !reduce ? { y: -4, boxShadow: 'var(--qt-shadow-md)' } : undefined}
      whileTap={interactive && !reduce ? { scale: 0.985 } : undefined}
      transition={spring}
      className={cn(
        'group relative isolate flex w-full flex-col overflow-hidden rounded-xl border border-white/10 p-5 text-start shadow-[var(--qt-pop)] transition-shadow duration-300 hover:shadow-[var(--qt-pop-hover)]',
        toneSurface[tone],
        interactive &&
          'cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'qt-star-tile-dark pointer-events-none absolute -end-6 -top-6 -z-10 size-44 [mask-image:radial-gradient(farthest-side_at_100%_0,black_15%,transparent_100%)] rtl:-start-6 rtl:end-auto rtl:[mask-image:radial-gradient(farthest-side_at_0_0,black_15%,transparent_100%)]',
          onLight && 'invert opacity-60',
        )}
      />
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium">{label}</p>
        {Icon ? (
          <span
            className={cn(
              'grid size-9 shrink-0 place-items-center rounded-full',
              onLight ? 'bg-teal-night/10' : 'bg-white/15',
            )}
          >
            <Icon className="size-5" />
          </span>
        ) : null}
      </div>
      <div className="mt-3 font-display text-3xl leading-none font-normal tabular-nums md:text-4xl">
        {isLoading ? (
          <Skeleton className={cn('h-9 w-24', onLight ? 'bg-teal-night/15' : 'bg-white/25')} />
        ) : typeof value === 'number' ? (
          <CountUp value={value} suffix={suffix} decimals={decimals} />
        ) : (
          value
        )}
      </div>
      {delta && !isLoading ? (
        <p
          className={cn(
            'mt-2 flex items-center gap-1 text-xs font-medium',
            solidDelta ?? deltaToneSolid[delta.direction],
          )}
        >
          {DeltaIcon ? <DeltaIcon className="size-3.5 rtl:-scale-x-100" /> : null}
          <span>{delta.value}</span>
          {delta.srLabel ? <span className="sr-only">{delta.srLabel}</span> : null}
        </p>
      ) : null}
      {description && !isLoading ? (
        <p className={cn('mt-2 text-xs', onLight ? 'text-teal-night' : 'text-white/85')}>
          {description}
        </p>
      ) : null}
    </Comp>
  )
}
