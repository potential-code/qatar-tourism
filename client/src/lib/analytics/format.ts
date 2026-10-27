/**
 * Number and delta formatting shared by the tiles, the axes and the tooltips.
 *
 * Kept in one place so a dashboard cannot show `1,284` on a tile and `1284`
 * on the axis beside it.
 */
import type { MetricUnit } from './types'

/** Direction of a change, as the stat tiles describe it. */
export type DeltaDirection = 'up' | 'down' | 'flat'

/** A change between two periods, ready to render. */
export interface Delta {
  /** Signed percentage, or null when the previous period was zero. */
  percent: number | null
  direction: DeltaDirection
  /** Pre-formatted text, e.g. `+12.4%` or `New`. */
  label: string
}

/**
 * Compact form for a headline figure: `1,284`, `12.9K`, `4.2M`.
 *
 * Below ten thousand the exact number is shown — a tile reading `9.8K` when
 * the answer is `9,764` is worse than the two extra characters.
 */
export function compactNumber(value: number, locale = 'en-GB'): string {
  if (!Number.isFinite(value)) return '—'
  if (Math.abs(value) < 10_000) return value.toLocaleString(locale)
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

/** Full form, thousands-separated. Used on axes and in table cells. */
export function exactNumber(value: number, locale = 'en-GB'): string {
  return Number.isFinite(value) ? value.toLocaleString(locale) : '—'
}

/** One decimal place and a percent sign. */
export function percent(value: number, locale = 'en-GB'): string {
  if (!Number.isFinite(value)) return '—'
  return `${value.toLocaleString(locale, { maximumFractionDigits: 1 })}%`
}

/** Formats a metric's headline value according to its declared unit. */
export function formatMetricValue(value: number, unit: MetricUnit, locale = 'en-GB'): string {
  if (unit === 'percent') return percent(value, locale)
  if (unit === 'duration_ms') {
    if (value < 1000) return `${Math.round(value)} ms`
    if (value < 60_000) return `${(value / 1000).toFixed(1)} s`
    return `${(value / 60_000).toFixed(1)} min`
  }
  if (unit === 'currency') return compactNumber(value, locale)
  return compactNumber(value, locale)
}

/**
 * The change from `previous` to `current`.
 *
 * A previous period of zero has no percentage — dividing by it gives
 * `Infinity`, and "+∞%" on a tile is noise. The label says `New` instead when
 * something appeared, and `No change` when both periods were empty.
 */
export function delta(current: number, previous: number, locale = 'en-GB'): Delta {
  if (previous === 0) {
    if (current === 0) return { percent: null, direction: 'flat', label: 'No change' }
    return { percent: null, direction: 'up', label: 'New' }
  }

  const change = ((current - previous) / previous) * 100
  const direction: DeltaDirection = Math.abs(change) < 0.05 ? 'flat' : change > 0 ? 'up' : 'down'
  const sign = change > 0 ? '+' : ''
  return {
    percent: change,
    direction,
    label: `${sign}${change.toLocaleString(locale, { maximumFractionDigits: 1 })}%`,
  }
}

/** `3 May 2025`. */
export function formatDate(value: Date | string, locale = 'en-GB'): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

/** Title case for a role or other machine token: `mentor` -> `Mentor`. */
export function humanise(value: string): string {
  const spaced = value.replace(/[_-]+/g, ' ').trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}
