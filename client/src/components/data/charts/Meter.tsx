/**
 * A single ratio against a limit — 62% of seats used, 340 of 500 invited.
 *
 * Not a two-slice pie. A pie of two slices makes the reader compare two
 * angles to learn one number; a meter puts the number on screen and uses
 * length, which is the encoding people read most accurately.
 *
 * The unfilled track is a lighter step of the fill's own ramp rather than
 * grey, so the state reads across the whole bar rather than only across the
 * filled part. Severity is carried by the fill *and* by the status word
 * beside it — never by colour alone.
 */
import type * as React from 'react'
import { useId } from 'react'
import { percent } from '@/lib/analytics/format'
import { cn } from '@/lib/utils'
import { STATUS_COLORS, type StatusTone, seriesColor } from './palette'

export interface MeterProps {
  label: React.ReactNode
  value: number
  max: number
  /** Overrides the automatic tone. */
  tone?: StatusTone | 'neutral'
  /** Word shown beside the percentage, so tone is never colour-alone. */
  toneLabel?: string
  /** Text under the bar: `340 of 500 seats`. */
  caption?: React.ReactNode
  className?: string
}

/** Tone from the fraction, when the caller does not choose one. */
function toneFor(fraction: number): StatusTone | 'neutral' {
  if (fraction >= 0.95) return 'critical'
  if (fraction >= 0.8) return 'warning'
  return 'neutral'
}

export function Meter({ label, value, max, tone, toneLabel, caption, className }: MeterProps) {
  const safeMax = max > 0 ? max : 1
  const fraction = Math.min(Math.max(value / safeMax, 0), 1)
  const resolved = tone ?? toneFor(fraction)
  const accent = seriesColor(0)
  const labelId = useId()

  const fill =
    resolved === 'neutral'
      ? { light: accent.light, dark: accent.dark }
      : { light: STATUS_COLORS[resolved], dark: STATUS_COLORS[resolved] }

  // The track is derived from the fill rather than hardcoded, so a red
  // critical bar sits in a red track and a blue one in a blue track — the
  // state then reads across the whole bar instead of only across the filled
  // part. `color-mix` against the card surface gives the lighter step in
  // light mode and the darker one in dark mode without a second table of
  // hexes to keep in sync.
  const style = {
    '--meter-fill-light': fill.light,
    '--meter-fill-dark': fill.dark,
  } as React.CSSProperties

  return (
    <div
      className={cn(
        'w-full [--meter-fill:var(--meter-fill-light)]',
        'dark:[--meter-fill:var(--meter-fill-dark)]',
        className,
      )}
      style={style}
    >
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span id={labelId} className="text-sm font-medium">
          {label}
        </span>
        <span className="flex items-center gap-2 text-sm tabular-nums">
          {toneLabel ? (
            <span className="text-xs font-medium text-muted-foreground uppercase">{toneLabel}</span>
          ) : null}
          <span className="font-semibold">{percent(fraction * 100)}</span>
        </span>
      </div>

      <div
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-labelledby={labelId}
        className="h-2.5 w-full overflow-hidden rounded-full"
        style={{
          backgroundColor: 'color-mix(in oklab, var(--meter-fill) 26%, hsl(var(--card)))',
        }}
      >
        <div
          className="h-full rounded-full bg-(--meter-fill)"
          style={{ width: `${fraction * 100}%` }}
        />
      </div>

      {caption ? <p className="mt-2 text-xs text-muted-foreground">{caption}</p> : null}
    </div>
  )
}
