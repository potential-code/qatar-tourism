import * as React from 'react'
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts'
import {
  BAR_RADIUS,
  CATEGORY_AXIS_PROPS,
  GRID_PROPS,
  seriesColor,
  VALUE_AXIS_PROPS,
} from '@/components/data/charts'
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'

/**
 * Side-by-side bars per category (pre beside post). The kit has stacked bars only; grouped is
 * the right form when two measures of the same thing are compared per category. Series colours
 * come from the kit palette in fixed order: the "before" series takes the lighter slot.
 */
export function GroupedBarChart({
  data,
  series,
  height = 260,
  valueFormatter = (v: number) => `${Math.round(v)}`,
  slots = [2, 0],
}: {
  data: ReadonlyArray<Record<string, string | number>>
  series: readonly { key: string; label: string }[]
  height?: number
  valueFormatter?: (value: number) => string
  slots?: readonly number[]
}) {
  const config = React.useMemo<ChartConfig>(() => {
    const next: ChartConfig = {}
    series.forEach((item, index) => {
      const color = seriesColor(slots[index] ?? index)
      next[item.key] = { label: item.label, theme: { light: color.light, dark: color.dark } }
    })
    return next
  }, [series, slots])

  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <BarChart
        data={data as Array<Record<string, string | number>>}
        margin={{ top: 20, right: 8, left: 0, bottom: 0 }}
        barGap={4}
        barCategoryGap="22%"
      >
        <CartesianGrid {...GRID_PROPS} />
        <XAxis dataKey="label" {...CATEGORY_AXIS_PROPS} interval={0} tick={{ fontSize: 11 }} />
        <YAxis {...VALUE_AXIS_PROPS} domain={[0, 100]} tickFormatter={valueFormatter} />
        <ChartTooltip
          cursor={{ fill: 'var(--muted)', fillOpacity: 0.5 }}
          content={<ChartTooltipContent indicator="dot" />}
        />
        <ChartLegend content={<ChartLegendContent />} />
        {series.map((item) => (
          <Bar
            key={item.key}
            dataKey={item.key}
            fill={`var(--color-${item.key})`}
            maxBarSize={22}
            radius={[BAR_RADIUS, BAR_RADIUS, 0, 0]}
          >
            <LabelList
              dataKey={item.key}
              position="top"
              className="fill-muted-foreground"
              fontSize={10}
              formatter={(v: unknown) => valueFormatter(Number(v))}
            />
          </Bar>
        ))}
      </BarChart>
    </ChartContainer>
  )
}
