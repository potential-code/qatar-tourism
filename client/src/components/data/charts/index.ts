/**
 * Every chart form the template ships.
 *
 * Client-safe: nothing behind this barrel imports the database, the server
 * functions or `drizzle-orm`. A page can import one chart without dragging
 * anything server-side into its bundle.
 */

export {
  BAR_RADIUS,
  CATEGORY_AXIS_PROPS,
  DOT_RING,
  GRID_PROPS,
  MAX_BAR_SIZE,
  VALUE_AXIS_PROPS,
} from './axes'
export { ChartCard, type ChartCardProps } from './ChartCard'
export { ColumnChart, type ColumnChartProps, type ColumnDatum } from './ColumnChart'
export { DonutChart, type DonutChartProps, sliceTotal } from './DonutChart'
export { Heatmap, type HeatmapCell, type HeatmapProps } from './Heatmap'
export { HorizontalBarChart, type HorizontalBarChartProps } from './HorizontalBarChart'
export { barTipLabel, columnCapLabel, lastPointLabel } from './labels'
export { Meter, type MeterProps } from './Meter'
export { MultiLineChart, type MultiLineChartProps, type MultiSeries } from './MultiLineChart'
export {
  DEEMPHASIS,
  foldToOther,
  MAX_SERIES,
  MAX_SERIES_ALL_PAIRS,
  SEQUENTIAL_STEPS,
  SERIES_COLORS,
  type SeriesColor,
  type Slice,
  STATUS_COLORS,
  type StatusTone,
  sequentialInk,
  sequentialStep,
  seriesColor,
} from './palette'
export { Sparkline, type SparklineProps } from './Sparkline'
export { StackedBarChart, type StackedBarChartProps } from './StackedBarChart'
export { TrendChart, type TrendChartProps } from './TrendChart'
