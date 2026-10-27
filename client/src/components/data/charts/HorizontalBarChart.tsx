/**
 * Magnitude across categories with long names — roles, countries, sources.
 *
 * Horizontal because a category axis that has to rotate its labels to fit has
 * already lost; turning the chart on its side gives every name a full line of
 * reading width. Values sit just past the tip rather than inside the bar, so
 * a short bar cannot clip its own label.
 */
import * as React from 'react'
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { exactNumber } from '@/lib/analytics/format'
import { BAR_RADIUS, CATEGORY_AXIS_PROPS, GRID_PROPS, MAX_BAR_SIZE } from './axes'
import type { ColumnDatum } from './ColumnChart'
import { barTipLabel } from './labels'
import { seriesColor } from './palette'

export interface HorizontalBarChartProps {
  data: readonly ColumnDatum[]
  label: string
  colorIndex?: number
  height?: number
  /** Width reserved for the category names. */
  categoryWidth?: number
  valueFormatter?: (value: number) => string
}

export function HorizontalBarChart({
  data,
  label,
  colorIndex = 0,
  height = 260,
  categoryWidth = 110,
  valueFormatter = exactNumber,
}: HorizontalBarChartProps) {
  const color = seriesColor(colorIndex)
  const config = React.useMemo<ChartConfig>(
    () => ({ value: { label, theme: { light: color.light, dark: color.dark } } }),
    [label, color.light, color.dark],
  )
  const TipLabel = React.useMemo(() => barTipLabel(valueFormatter), [valueFormatter])

  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <BarChart
        data={data as ColumnDatum[]}
        layout="vertical"
        margin={{ top: 4, right: 56, left: 0, bottom: 4 }}
      >
        <CartesianGrid {...GRID_PROPS} vertical horizontal={false} />
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="label" {...CATEGORY_AXIS_PROPS} width={categoryWidth} />
        <ChartTooltip
          cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.5 }}
          content={<ChartTooltipContent indicator="dot" />}
        />
        <Bar
          dataKey="value"
          fill="var(--color-value)"
          maxBarSize={MAX_BAR_SIZE}
          radius={[0, BAR_RADIUS, BAR_RADIUS, 0]}
        >
          <LabelList dataKey="value" content={TipLabel} />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
