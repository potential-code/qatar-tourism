/**
 * A single series over time — the default answer to "how has this moved".
 *
 * Area for one series (the wash reads as volume without implying a second
 * value), line when the panel already carries another mark. One series means
 * no legend: there is only one colour, and the title already says what it is.
 */
import * as React from 'react'
import { Area, AreaChart, CartesianGrid, LabelList, Line, LineChart, XAxis, YAxis } from 'recharts'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { exactNumber } from '@/lib/analytics/format'
import type { SeriesPointDto } from '@/lib/analytics/types'
import { CATEGORY_AXIS_PROPS, DOT_RING, GRID_PROPS, VALUE_AXIS_PROPS } from './axes'
import { lastPointLabel } from './labels'
import { seriesColor } from './palette'

export interface TrendChartProps {
  data: readonly SeriesPointDto[]
  /** Name of the series, used by the tooltip. */
  label: string
  variant?: 'area' | 'line'
  /** Categorical slot to draw in. Defaults to the first. */
  colorIndex?: number
  height?: number
  /**
   * Where the value axis starts. `zero` always, except for a *line* plotting
   * a cumulative total, where a zero baseline flattens the whole curve into a
   * straight edge. Never `auto` on an `area`: a filled shape read off a
   * truncated baseline overstates every difference in it.
   */
  baseline?: 'zero' | 'auto'
  valueFormatter?: (value: number) => string
}

export function TrendChart({
  data,
  label,
  variant = 'area',
  colorIndex = 0,
  height = 260,
  baseline = 'zero',
  valueFormatter = exactNumber,
}: TrendChartProps) {
  const color = seriesColor(colorIndex)
  const config = React.useMemo<ChartConfig>(
    () => ({ value: { label, theme: { light: color.light, dark: color.dark } } }),
    [label, color.light, color.dark],
  )
  const rows = React.useMemo(() => data.map((point) => ({ ...point })), [data])
  const EndLabel = React.useMemo(
    () => lastPointLabel(rows.length, valueFormatter),
    [rows.length, valueFormatter],
  )

  // Recharts finds its axes by walking its *direct* children, so these cannot
  // be hoisted into a shared fragment — a fragment child is skipped and the
  // chart silently renders with no axes and no gridlines at all. It looks
  // like a styling problem and is not one.
  const domain: [number | 'auto', number | 'auto'] =
    variant === 'area' || baseline === 'zero' ? [0, 'auto'] : ['auto', 'auto']

  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      {variant === 'area' ? (
        <AreaChart data={rows} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="label" {...CATEGORY_AXIS_PROPS} />
          <YAxis
            {...VALUE_AXIS_PROPS}
            domain={domain}
            tickFormatter={(value: number) => valueFormatter(value)}
          />
          <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
          <Area
            dataKey="value"
            type="monotone"
            stroke="var(--color-value)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="var(--color-value)"
            fillOpacity={0.1}
            dot={false}
            activeDot={{ r: 4, ...DOT_RING }}
          >
            <LabelList dataKey="value" content={EndLabel} />
          </Area>
        </AreaChart>
      ) : (
        <LineChart data={rows} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="label" {...CATEGORY_AXIS_PROPS} />
          <YAxis
            {...VALUE_AXIS_PROPS}
            domain={domain}
            tickFormatter={(value: number) => valueFormatter(value)}
          />
          <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
          <Line
            dataKey="value"
            type="monotone"
            stroke="var(--color-value)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={false}
            activeDot={{ r: 4, ...DOT_RING }}
          >
            <LabelList dataKey="value" content={EndLabel} />
          </Line>
        </LineChart>
      )}
    </ChartContainer>
  )
}
