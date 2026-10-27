/**
 * Part-to-whole across categories.
 *
 * The segments are separated by a 2px gap in the **surface colour**, not by a
 * border. A stroke drawn around a mark adds ink that is not data and darkens
 * the chart as the series count rises; a gap in the card's own colour reads
 * as the segments not touching, which is what is true. Recharts has no gap
 * primitive, so the gap is drawn as a surface-coloured stroke — same pixels,
 * and the reason is worth stating so nobody "fixes" it into a border colour.
 */
import * as React from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { exactNumber } from '@/lib/analytics/format'
import { BAR_RADIUS, CATEGORY_AXIS_PROPS, GRID_PROPS, MAX_BAR_SIZE, VALUE_AXIS_PROPS } from './axes'
import type { MultiSeries } from './MultiLineChart'
import { MAX_SERIES, seriesColor } from './palette'

export interface StackedBarChartProps {
  /** One row per category, holding `label` plus one number per series key. */
  data: ReadonlyArray<Record<string, string | number>>
  series: readonly MultiSeries[]
  xKey?: string
  height?: number
  /** Horizontal layout, for many categories or long names. */
  horizontal?: boolean
  valueFormatter?: (value: number) => string
}

export function StackedBarChart({
  data,
  series,
  xKey = 'label',
  height = 260,
  horizontal = false,
  valueFormatter = exactNumber,
}: StackedBarChartProps) {
  const plotted = series.slice(0, MAX_SERIES)

  const config = React.useMemo<ChartConfig>(() => {
    const next: ChartConfig = {}
    plotted.forEach((item, index) => {
      const color = seriesColor(index)
      next[item.key] = { label: item.label, theme: { light: color.light, dark: color.dark } }
    })
    return next
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(plotted)])

  const last = plotted.length - 1

  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <BarChart
        data={data as Array<Record<string, string | number>>}
        layout={horizontal ? 'vertical' : 'horizontal'}
        margin={{ top: 12, right: 12, left: horizontal ? 8 : 0, bottom: 0 }}
      >
        <CartesianGrid {...GRID_PROPS} vertical={horizontal} horizontal={!horizontal} />
        {/* Recharts finds its axes by walking its *direct* children. Wrapping
            these in a fragment for the conditional would make it skip them,
            and the chart would render with no axes at all — so each branch
            returns the two axis elements as siblings instead. */}
        {horizontal ? (
          <XAxis type="number" {...VALUE_AXIS_PROPS} width={undefined} />
        ) : (
          <XAxis dataKey={xKey} {...CATEGORY_AXIS_PROPS} />
        )}
        {horizontal ? (
          <YAxis type="category" dataKey={xKey} {...CATEGORY_AXIS_PROPS} width={110} />
        ) : (
          <YAxis {...VALUE_AXIS_PROPS} tickFormatter={(value: number) => valueFormatter(value)} />
        )}
        <ChartTooltip
          cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.5 }}
          content={<ChartTooltipContent indicator="dot" />}
        />
        <ChartLegend content={<ChartLegendContent />} />
        {plotted.map((item, index) => (
          <Bar
            key={item.key}
            dataKey={item.key}
            stackId="stack"
            fill={`var(--color-${item.key})`}
            maxBarSize={MAX_BAR_SIZE}
            // The surface gap. Not a border — see the module comment.
            stroke="hsl(var(--card))"
            strokeWidth={2}
            radius={
              index === last
                ? horizontal
                  ? [0, BAR_RADIUS, BAR_RADIUS, 0]
                  : [BAR_RADIUS, BAR_RADIUS, 0, 0]
                : 0
            }
          />
        ))}
      </BarChart>
    </ChartContainer>
  )
}
