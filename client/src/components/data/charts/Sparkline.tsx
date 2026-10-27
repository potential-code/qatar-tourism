/**
 * Twelve-ish points of shape, no axes, no gridlines.
 *
 * A sparkline is context for a number, not a chart in its own right: it says
 * "rising", "flat" or "spiky" at a glance and nothing more precise. It is the
 * one plotted form the template ships without a hover layer by default,
 * because inside a stat tile the tile itself is the hit target.
 */
import * as React from 'react'
import { Area, AreaChart, Line, LineChart, ResponsiveContainer, Tooltip } from 'recharts'
import { exactNumber } from '@/lib/analytics/format'
import type { SeriesPointDto } from '@/lib/analytics/types'
import { seriesColor } from './palette'

export interface SparklineProps {
  data: readonly SeriesPointDto[]
  colorIndex?: number
  height?: number
  /** Fill under the line. Off by default — a tile is small enough already. */
  filled?: boolean
  /** Adds a hover readout. Use for a standalone sparkline, not one in a tile. */
  showTooltip?: boolean
  /** Accessible summary, since there are no axes to read. */
  ariaLabel?: string
}

export function Sparkline({
  data,
  colorIndex = 0,
  height = 40,
  filled = false,
  showTooltip = false,
  ariaLabel,
}: SparklineProps) {
  const color = seriesColor(colorIndex)
  const rows = React.useMemo(() => data.map((point) => ({ ...point })), [data])

  // The tokens are per-mode, and a sparkline is too small to justify the
  // scoped <style> a full ChartContainer emits. Two CSS variables on the
  // wrapper do the same job.
  const style = {
    '--spark-light': color.light,
    '--spark-dark': color.dark,
  } as React.CSSProperties

  return (
    <div
      className="w-full [--spark:var(--spark-light)] dark:[--spark:var(--spark-dark)]"
      style={{ ...style, height }}
      role="img"
      aria-label={ariaLabel ?? 'Trend'}
    >
      <ResponsiveContainer width="100%" height="100%">
        {filled ? (
          <AreaChart data={rows} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
            {showTooltip ? <Tooltip content={<SparkTooltip />} cursor={false} /> : <></>}
            <Area
              dataKey="value"
              type="monotone"
              stroke="var(--spark)"
              strokeWidth={2}
              strokeLinecap="round"
              fill="var(--spark)"
              fillOpacity={0.1}
              dot={false}
              activeDot={{ r: 3, stroke: 'hsl(var(--card))', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        ) : (
          <LineChart data={rows} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
            {showTooltip ? <Tooltip content={<SparkTooltip />} cursor={false} /> : <></>}
            <Line
              dataKey="value"
              type="monotone"
              stroke="var(--spark)"
              strokeWidth={2}
              strokeLinecap="round"
              dot={false}
              activeDot={{ r: 3, stroke: 'hsl(var(--card))', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

/** Minimal readout: the label and the value, in text tokens. */
function SparkTooltip(props: {
  active?: boolean
  payload?: Array<{ payload?: { label?: string; value?: number } }>
}) {
  const point = props.payload?.[0]?.payload
  if (!props.active || !point) return null
  return (
    <div className="rounded-md border border-border/50 bg-popover px-2 py-1 text-xs text-popover-foreground shadow-lg">
      <span className="text-muted-foreground">{point.label}</span>
      <span className="ms-2 font-medium tabular-nums">{exactNumber(point.value ?? 0)}</span>
    </div>
  )
}
