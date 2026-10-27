/**
 * Magnitude over a grid — hour of day against day of week is the usual one.
 *
 * Sequential encoding: one hue, more is darker on a light surface and lighter
 * on a dark one, so the low end recedes toward the surface in both modes. No
 * rainbow: a hue ramp makes the reader learn an arbitrary order before they
 * can read a value, and under colour-vision deficiency they cannot learn it
 * at all.
 *
 * Built from CSS grid rather than an SVG chart library: the marks are
 * rectangles on a fixed lattice, which is exactly what grid does, and it
 * keeps the cells as real DOM nodes so a screen reader can read them.
 */
import * as React from 'react'
import { exactNumber } from '@/lib/analytics/format'
import { cn } from '@/lib/utils'
import { SEQUENTIAL_STEPS, sequentialStep } from './palette'

/** One cell's value at a row/column intersection. */
export interface HeatmapCell {
  row: string
  column: string
  value: number
}

export interface HeatmapProps {
  rows: readonly string[]
  columns: readonly string[]
  cells: readonly HeatmapCell[]
  /** Upper bound of the ramp. Defaults to the largest cell. */
  max?: number
  /** Legend caption, e.g. "sessions started". */
  valueLabel?: string
  className?: string
}

/** Cell lookup key. The separator cannot occur in a row or column name. */
function cellKey(row: string, column: string): string {
  return `${row} :: ${column}`
}

export function Heatmap({ rows, columns, cells, max, valueLabel, className }: HeatmapProps) {
  const resolvedMode = 'light' as 'light' | 'dark'
  const mode = resolvedMode === 'dark' ? 'dark' : 'light'

  const lookup = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const cell of cells) map.set(cellKey(cell.row, cell.column), cell.value)
    return map
  }, [cells])

  const ceiling = React.useMemo(() => {
    if (max !== undefined && max > 0) return max
    let highest = 0
    for (const cell of cells) highest = Math.max(highest, cell.value)
    return highest > 0 ? highest : 1
  }, [cells, max])

  return (
    <div className={cn('w-full', className)}>
      <div className="overflow-x-auto">
        <div
          className="grid min-w-[520px] gap-[2px]"
          style={{ gridTemplateColumns: `auto repeat(${columns.length}, minmax(0, 1fr))` }}
        >
          <div />
          {columns.map((column) => (
            <div key={column} className="pb-1 text-center text-[11px] text-muted-foreground">
              {column}
            </div>
          ))}

          {rows.map((row) => (
            <React.Fragment key={row}>
              <div className="pe-2 text-end text-[11px] leading-6 text-muted-foreground">{row}</div>
              {columns.map((column) => {
                const value = lookup.get(cellKey(row, column)) ?? 0
                const fraction = value / ceiling
                return (
                  <div
                    key={cellKey(row, column)}
                    title={`${row}, ${column}: ${exactNumber(value)}`}
                    aria-label={`${row} ${column}, ${exactNumber(value)}`}
                    className="h-6 rounded-[3px] transition-transform hover:scale-[1.08]"
                    style={{ backgroundColor: sequentialStep(fraction, mode) }}
                  />
                )
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2 text-[11px] text-muted-foreground">
        <span>0</span>
        <div className="flex gap-[2px]">
          {SEQUENTIAL_STEPS[mode].map((step) => (
            <span
              key={step}
              className="h-2.5 w-6 rounded-[2px]"
              style={{ backgroundColor: step }}
            />
          ))}
        </div>
        <span className="tabular-nums">{exactNumber(ceiling)}</span>
        {valueLabel ? <span className="ms-1">{valueLabel}</span> : null}
      </div>
    </div>
  )
}
