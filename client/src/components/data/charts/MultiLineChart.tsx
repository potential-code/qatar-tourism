/**
 * Two to four series sharing one axis — for when telling the series apart is
 * the reader's job.
 *
 * **One axis, always.** Two measures of different scale get two charts, small
 * multiples, or a common index base; a second y-scale lets the author decide
 * where the lines cross, which is the single most misleading thing a chart
 * can do. If your series do not share a scale, this is the wrong component.
 */
import * as React from 'react'
import { CartesianGrid, LabelList, Line, LineChart, XAxis, YAxis } from 'recharts'
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { exactNumber } from '@/lib/analytics/format'
import { CATEGORY_AXIS_PROPS, DOT_RING, GRID_PROPS, VALUE_AXIS_PROPS } from './axes'
import { lastPointLabel } from './labels'
import { MAX_SERIES, seriesColor } from './palette'

/** One plotted series. */
export interface MultiSeries {
  /** Key of the value in each row. */
  key: string
  /** Legend text. */
  label: string
}

export interface MultiLineChartProps {
  /** One row per x position, holding `label` plus one number per series key. */
  data: ReadonlyArray<Record<string, string | number>>
  series: readonly MultiSeries[]
  /** Key holding the x-axis text. Defaults to `label`. */
  xKey?: string
  height?: number
  /** Direct-label the final point of each line. Off when lines converge. */
  labelEnds?: boolean
  valueFormatter?: (value: number) => string
}

export function MultiLineChart({
  data,
  series,
  xKey = 'label',
  height = 260,
  labelEnds = true,
  valueFormatter = exactNumber,
}: MultiLineChartProps) {
  // Past the slot ceiling the palette has no honest answer, so the extra
  // series are dropped rather than given a repeated colour. Fold the tail
  // into "Other" before calling this if you have more.
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

  const EndLabel = React.useMemo(
    () => lastPointLabel(data.length, valueFormatter),
    [data.length, valueFormatter],
  )

  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <LineChart
        data={data as Array<Record<string, string | number>>}
        margin={{ top: 16, right: 16, left: 0, bottom: 0 }}
      >
        <CartesianGrid {...GRID_PROPS} />
        <XAxis dataKey={xKey} {...CATEGORY_AXIS_PROPS} />
        <YAxis {...VALUE_AXIS_PROPS} tickFormatter={(value: number) => valueFormatter(value)} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
        <ChartLegend content={<ChartLegendContent />} />
        {plotted.map((item) => (
          <Line
            key={item.key}
            dataKey={item.key}
            type="monotone"
            stroke={`var(--color-${item.key})`}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={false}
            activeDot={{ r: 4, ...DOT_RING }}
          >
            {labelEnds ? <LabelList dataKey={item.key} content={EndLabel} /> : null}
          </Line>
        ))}
      </LineChart>
    </ChartContainer>
  )
}
