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
  tone?: 'teal' | 'maroon' | 'neutral'
  className?: string
}

const deltaIcon = { up: ArrowUpRight, down: ArrowDownRight, flat: Minus }
const deltaTone = { up: 'text-success', down: 'text-destructive', flat: 'text-muted-foreground' }
const toneAccent = { teal: 'bg-teal', maroon: 'bg-maroon', neutral: 'bg-ink/30' }

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
  const Comp = interactive ? motion.button : motion.div

  return (
    <Comp
      type={interactive ? 'button' : undefined}
      onClick={onClick}
      whileHover={interactive && !reduce ? { y: -4, boxShadow: 'var(--qt-shadow-md)' } : undefined}
      whileTap={interactive && !reduce ? { scale: 0.985 } : undefined}
      transition={spring}
      className={cn(
        'group relative flex w-full flex-col overflow-hidden rounded-xl border bg-card p-5 text-start shadow-xs',
        interactive &&
          'cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        className,
      )}
    >
      <span aria-hidden="true" className={cn('absolute inset-y-0 start-0 w-1', toneAccent[tone])} />
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon ? (
          <Icon className="size-5 shrink-0 text-teal/50 transition-colors group-hover:text-teal" />
        ) : null}
      </div>
      <div className="mt-3 font-display text-3xl leading-none font-normal tabular-nums text-ink md:text-4xl">
        {isLoading ? (
          <Skeleton className="h-9 w-24" />
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
            deltaTone[delta.direction],
          )}
        >
          {DeltaIcon ? <DeltaIcon className="size-3.5 rtl:-scale-x-100" /> : null}
          <span>{delta.value}</span>
          {delta.srLabel ? <span className="sr-only">{delta.srLabel}</span> : null}
        </p>
      ) : null}
      {description && !isLoading ? (
        <p className="mt-2 text-xs text-muted-foreground">{description}</p>
      ) : null}
    </Comp>
  )
}
