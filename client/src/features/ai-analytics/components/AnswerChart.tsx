import type { AnswerChart as Chart } from '@shared/schemas/admin-ai'
import { ColumnChart, HorizontalBarChart } from '@/components/data'
import { GroupedBarChart } from '@/features/admin-dashboard/components/charts/GroupedBarChart'

const format = (unit: Chart['unit']) => (v: number) =>
  unit === 'percent'
    ? `${v.toLocaleString('en-GB', { maximumFractionDigits: 1 })}%`
    : unit === 'points'
      ? `${v} pp`
      : v.toLocaleString('en-GB')

/** Renders the chart an answer asked for, with the kit's forms and palette. */
export function AnswerChart({ chart }: { chart: Chart }) {
  if (chart.type === 'grouped')
    return (
      <GroupedBarChart
        data={chart.data}
        series={chart.series}
        height={280}
        valueFormatter={(v) => `${Math.round(v)}`}
      />
    )
  if (chart.type === 'bar')
    return (
      <HorizontalBarChart
        data={chart.data}
        label={chart.label}
        height={Math.max(180, chart.data.length * 48)}
        categoryWidth={220}
        valueFormatter={format(chart.unit)}
      />
    )
  return (
    <ColumnChart
      data={chart.data}
      label={chart.label}
      height={260}
      valueFormatter={format(chart.unit)}
    />
  )
}
