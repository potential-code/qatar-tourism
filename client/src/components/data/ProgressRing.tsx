import type * as React from 'react'

import { cn } from '@/lib/utils'

export interface ProgressRingProps {
  /** Current progress, between `0` and `max`. */
  value: number
  max?: number
  /** Outer diameter in pixels. */
  size?: number
  strokeWidth?: number
  /** Accessible name for the progress bar, also shown under the value. */
  label?: React.ReactNode
  /** Replaces the default percentage readout in the middle of the ring. */
  children?: React.ReactNode
  /** Accessible name when `label` is a node rather than a string. */
  ariaLabel?: string
  className?: string
}

/**
 * Circular progress indicator drawn with SVG. The ring always sweeps clockwise
 * from the top, in both LTR and RTL, because the `<svg>` is pinned to `dir="ltr"`.
 */
export function ProgressRing({
  value,
  max = 100,
  size = 56,
  strokeWidth = 6,
  label,
  children,
  ariaLabel,
  className,
}: ProgressRingProps) {
  const safeMax = max > 0 ? max : 100
  const clamped = Math.min(safeMax, Math.max(0, Number.isFinite(value) ? value : 0))
  const ratio = clamped / safeMax

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - ratio * circumference

  const accessibleName = ariaLabel ?? (typeof label === 'string' ? label : undefined)

  return (
    <div
      data-slot="progress-ring"
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-label={accessibleName}
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <span dir="ltr" className="contents">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden="true"
          focusable="false"
          className="-rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className="stroke-muted"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="stroke-primary transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
          />
        </svg>
      </span>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children ?? (
          <>
            <span
              data-slot="progress-ring-value"
              className="text-[13px] leading-none font-bold tabular-nums"
            >
              {Math.round(ratio * 100)}%
            </span>
            {label ? (
              <span
                data-slot="progress-ring-label"
                className="mt-0.5 text-[8px] tracking-wider text-muted-foreground uppercase"
              >
                {label}
              </span>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
