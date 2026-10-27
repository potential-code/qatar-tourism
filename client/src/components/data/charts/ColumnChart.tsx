/**
 * Magnitude across a handful of categories, read left to right.
 *
 * One hue: the categories are not identities competing for attention, they
 * are positions on a scale, and colouring each one differently would claim
 * otherwise. Bars are capped at 24px so the band's leftover is air, and the
 * data-end is rounded while the baseline stays square.
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
import { BAR_RADIUS, CATEGORY_AXIS_PROPS, GRID_PROPS, MAX_BAR_SIZE, VALUE_AXIS_PROPS } from './axes'
import { columnCapLabel } from './labels'
import { seriesColor } from './palette'

export interface ColumnDatum {
  label: string
  value: number
}

export interface ColumnChartProps {
  data: readonly ColumnDatum[]
  /** Series name, used by the tooltip. */
  label: string
  colorIndex?: number
  height?: number
  /** Value on each cap. Turn off when the bars are many or the values long. */
  showValues?: boolean
  valueFormatter?: (value: number) => string
}

export function ColumnChart({
  data,
  label,
  colorIndex = 0,
  height = 260,
  showValues = true,
  valueFormatter = exactNumber,
}: ColumnChartProps) {
  const color = seriesColor(colorIndex)
  const config = React.useMemo<ChartConfig>(
    () => ({ value: { label, theme: { light: color.light, dark: color.dark } } }),
    [label, color.light, color.dark],
  )
  const CapLabel = React.useMemo(() => columnCapLabel(valueFormatter), [valueFormatter])

  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <BarChart data={data as ColumnDatum[]} margin={{ top: 20, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis dataKey="label" {...CATEGORY_AXIS_PROPS} />
        <YAxis {...VALUE_AXIS_PROPS} tickFormatter={(value: number) => valueFormatter(value)} />
        <ChartTooltip
          cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.5 }}
          content={<ChartTooltipContent indicator="dot" />}
        />
        <Bar
          dataKey="value"
          fill="var(--color-value)"
          maxBarSize={MAX_BAR_SIZE}
          radius={[BAR_RADIUS, BAR_RADIUS, 0, 0]}
        >
          {showValues ? <LabelList dataKey="value" content={CapLabel} /> : null}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
