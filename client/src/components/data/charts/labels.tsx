/**
 * Direct labels, applied sparingly.
 *
 * A value beside every point is chaos and goes unread, so the only labels the
 * template draws inside a plot are the ones that carry the story: the last
 * point of a line, and the tip of a bar. Everything else lives on the axis,
 * in the tooltip, or in the table view.
 *
 * Labels wear text tokens, never the series colour — a light hue such as the
 * yellow slot is illegible as text on the card surface, and identity is
 * already carried by the coloured mark beside it.
 */
import type * as React from 'react'
import type { LabelProps } from 'recharts'

/** The subset of the label props recharts hands a custom renderer. */
interface LabelRenderProps {
  x?: number | string
  y?: number | string
  width?: number | string
  height?: number | string
  value?: number | string
  index?: number
}

function toNumber(value: number | string | undefined): number {
  return typeof value === 'number' ? value : Number(value ?? 0)
}

/**
 * Labels only the final point of a line or area.
 *
 * `total` is the point count, closed over rather than read from the render
 * props, because recharts does not hand the renderer the series length.
 */
export function lastPointLabel(total: number, format: (value: number) => string) {
  return function LastPointLabel(rawProps: LabelProps): React.ReactElement {
    const props = rawProps as LabelRenderProps
    if (props.index !== total - 1) return <g />
    const value = toNumber(props.value)
    if (!Number.isFinite(value)) return <g />
    return (
      <text
        x={toNumber(props.x)}
        y={toNumber(props.y)}
        dy={-10}
        dx={-4}
        textAnchor="end"
        className="fill-foreground text-[11px] font-medium"
      >
        {format(value)}
      </text>
    )
  }
}

/** Value on the cap of a column. */
export function columnCapLabel(format: (value: number) => string) {
  return function ColumnCapLabel(rawProps: LabelProps): React.ReactElement {
    const props = rawProps as LabelRenderProps
    const value = toNumber(props.value)
    if (!Number.isFinite(value) || value === 0) return <g />
    return (
      <text
        x={toNumber(props.x) + toNumber(props.width) / 2}
        y={toNumber(props.y)}
        dy={-6}
        textAnchor="middle"
        className="fill-muted-foreground text-[11px] tabular-nums"
      >
        {format(value)}
      </text>
    )
  }
}

/**
 * Value just past the tip of a horizontal bar.
 *
 * Outside the bar rather than inside it: a label placed inside has to be
 * measured against the bar's width first, and a short bar would clip it.
 */
export function barTipLabel(format: (value: number) => string) {
  return function BarTipLabel(rawProps: LabelProps): React.ReactElement {
    const props = rawProps as LabelRenderProps
    const value = toNumber(props.value)
    if (!Number.isFinite(value)) return <g />
    return (
      <text
        x={toNumber(props.x) + toNumber(props.width) + 8}
        y={toNumber(props.y) + toNumber(props.height) / 2}
        dy={4}
        textAnchor="start"
        className="fill-foreground text-[11px] font-medium tabular-nums"
      >
        {format(value)}
      </text>
    )
  }
}
