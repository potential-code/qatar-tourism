/** One plotted point. `key` orders; `label` is display only. */
export interface SeriesPointDto {
  key: string
  label: string
  value: number
}

export const METRIC_UNITS = ['count', 'percent', 'duration_ms', 'currency'] as const
export type MetricUnit = (typeof METRIC_UNITS)[number]
