/**
 * Part-to-whole for a very small number of parts.
 *
 * A donut is the weakest of the part-to-whole forms — angle is harder to
 * compare than length — so it is capped at three slices plus "Other" and is
 * offered mainly because a stakeholder will ask for one. A horizontal stacked
 * bar answers the same question more precisely; prefer it when you have the
 * choice.
 *
 * Three slices is also the palette's all-pairs ceiling: any slice may be
 * compared with any other here, and the fourth categorical slot (yellow)
 * fails the colour-vision floor against the second (orange) under that
 * comparison. `foldToOther` does the folding.
 */
import * as React from 'react'
import { Cell, Pie, PieChart } from 'recharts'
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { compactNumber } from '@/lib/analytics/format'
import { foldToOther, type Slice, seriesColor } from './palette'

export interface DonutChartProps {
  data: readonly Slice[]
  height?: number
  /** Figure shown in the hole. Omit for a plain donut. */
  centerValue?: React.ReactNode
  centerLabel?: React.ReactNode
  /** Label the tail slice is folded into. */
  otherLabel?: string
}

export function DonutChart({
  data,
  height = 260,
  centerValue,
  centerLabel,
  otherLabel = 'Other',
}: DonutChartProps) {
  const slices = React.useMemo(
    () => foldToOther(data, 3, otherLabel),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(data), otherLabel],
  )

  const config = React.useMemo<ChartConfig>(() => {
    const next: ChartConfig = {}
    slices.forEach((slice, index) => {
      const color =
        slice.key === 'other' ? { light: '#c3c2b7', dark: '#52514e' } : seriesColor(index)
      next[slice.key] = { label: slice.label, theme: { light: color.light, dark: color.dark } }
    })
    return next
  }, [slices])

  return (
    <div className="relative">
      <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="key" hideLabel />} />
          <Pie
            data={slices as Slice[]}
            dataKey="value"
            nameKey="key"
            innerRadius="58%"
            outerRadius="82%"
            // The surface gap again: 2px of card colour between slices.
            stroke="hsl(var(--card))"
            strokeWidth={2}
            paddingAngle={1}
          >
            {slices.map((slice) => (
              <Cell key={slice.key} fill={`var(--color-${slice.key})`} />
            ))}
          </Pie>
          <ChartLegend content={<ChartLegendContent nameKey="key" />} />
        </PieChart>
      </ChartContainer>

      {centerValue !== undefined ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center justify-center"
          style={{ height: height - 40 }}
        >
          <span className="text-2xl leading-none font-semibold">{centerValue}</span>
          {centerLabel ? (
            <span className="mt-1 text-xs text-muted-foreground">{centerLabel}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/** Total of a breakdown, for the figure in the hole. */
export function sliceTotal(slices: readonly Slice[]): string {
  return compactNumber(slices.reduce((sum, slice) => sum + slice.value, 0))
}
