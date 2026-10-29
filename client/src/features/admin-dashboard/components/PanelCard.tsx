import type { ReactNode } from 'react'
import { Reveal } from '@/components/motion'
import { cn } from '@/lib/utils'
import { MetricInfo } from './MetricInfo'

/**
 * The dashboard's panel frame: a quiet card with a display-type title, a one-line description,
 * the metric definition popover and an optional action. Reveals once on scroll.
 */
export function PanelCard({
  title,
  description,
  info,
  action,
  children,
  className,
  delay = 0,
}: {
  title: ReactNode
  description?: ReactNode
  info?: { label: string; definition: string }
  action?: ReactNode
  children: ReactNode
  className?: string
  delay?: number
}) {
  return (
    <Reveal
      delay={delay}
      className={cn(
        'flex min-w-0 flex-col rounded-xl border border-teal-night/8 bg-gradient-to-br from-white via-white to-teal-mist/70 p-6 shadow-[var(--qt-pop)] transition-shadow duration-300 hover:shadow-[var(--qt-pop-hover)]',
        className,
      )}
    >
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-xl leading-tight font-normal text-ink">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {action}
          {info ? <MetricInfo {...info} /> : null}
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </Reveal>
  )
}
