/**
 * Shared axis and grid settings.
 *
 * Every chart takes these rather than restating them, so a gridline is the
 * same weight on every panel and the axes stay recessive. Values follow the
 * mark specs: hairline solid gridlines one step off the surface, no axis
 * line, no tick marks, muted tick text (core's `ChartContainer` already fills
 * tick text with `--muted-foreground`).
 */

/** Horizontal gridlines only. Vertical ones fight the marks and add nothing. */
export const GRID_PROPS = {
  vertical: false,
  strokeDasharray: undefined,
  stroke: 'hsl(var(--border))',
  strokeWidth: 1,
} as const

/** A category axis: no line, no ticks, breathing room under the labels. */
export const CATEGORY_AXIS_PROPS = {
  tickLine: false,
  axisLine: false,
  tickMargin: 8,
  minTickGap: 12,
} as const

/** A value axis: narrow, unlined, rounded ticks. */
export const VALUE_AXIS_PROPS = {
  tickLine: false,
  axisLine: false,
  tickMargin: 8,
  width: 44,
} as const

/** The 2px surface ring an end-dot or an active dot carries. */
export const DOT_RING = {
  stroke: 'hsl(var(--card))',
  strokeWidth: 2,
} as const

/** Mark specs: bars are capped rather than filling their slot. */
export const MAX_BAR_SIZE = 24
/** Radius of a bar's data-end. Square at the baseline. */
export const BAR_RADIUS = 4
