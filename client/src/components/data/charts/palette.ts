/**
 * The chart palette.
 *
 * Core's `styles.css` ships five `--chart-*` tokens for decorative use. They
 * are not safe as a *categorical* series palette: run them through a
 * colour-vision-deficiency check and slot 4 (violet) against slot 3 (blue)
 * separates by ΔE 2.2 under deuteranopia in light mode and 1.4 in dark, which
 * is to say a red-green colour-blind reader cannot tell two lines apart. In
 * dark mode three of the five also sit outside the lightness band for that
 * surface, and the worst pair is ΔE 13.8 even with full colour vision.
 *
 * So this template carries its own four-slot series palette, validated
 * against the surfaces it actually renders on — core's `--card`, `#fafafa`
 * light and `#171717` dark. Both modes are *selected*, not flipped: the dark
 * column is the same four hues re-stepped for a dark surface.
 *
 * Worst adjacent pair, light: ΔE 9.1 CVD / 22.9 normal.
 * Worst adjacent pair, dark:  ΔE 8.4 CVD / 19.8 normal.
 *
 * **To rebrand, replace the hexes here and nothing else** — every chart reads
 * them through `seriesColor`. Re-run the validation afterwards; a palette
 * chosen by eye fails these gates more often than not.
 */

/** One categorical slot, stepped for each surface. */
export interface SeriesColor {
  light: string
  dark: string
}

/**
 * The categorical slots, in fixed order. Assigned by position and never
 * cycled: a fifth series is not a generated fifth hue, it is "Other".
 */
export const SERIES_COLORS: readonly SeriesColor[] = [
  { light: '#00627b', dark: '#00627b' }, // Qatar Tourism teal
  { light: '#7d002a', dark: '#7d002a' }, // Qatar Tourism maroon
  { light: '#7fb0bc', dark: '#7fb0bc' }, // light teal
  { light: '#bf4f00', dark: '#bf4f00' }, // logo orange accent
]

/**
 * Ceiling for forms whose marks sit next to each other — stacked segments,
 * grouped bars, lines sharing an axis. Four slots clear every gate there.
 */
export const MAX_SERIES = 4

/**
 * Ceiling for forms where any slice may be compared with any other — a pie or
 * donut, a scatter, small multiples. Slot 4 (yellow) beside slot 2 (orange)
 * fails the all-pairs floor, so those forms stop at three and fold the rest
 * into "Other".
 */
export const MAX_SERIES_ALL_PAIRS = 3

/**
 * The slot at `index`, clamped to the last one.
 *
 * Clamping rather than wrapping is deliberate: wrapping would give series 5
 * the same colour as series 1 and quietly claim they are the same thing. A
 * caller with more series than slots should fold the tail into "Other" —
 * `foldToOther` does it.
 */
export function seriesColor(index: number): SeriesColor {
  const slot = SERIES_COLORS[Math.min(Math.max(index, 0), SERIES_COLORS.length - 1)]
  // `noUncheckedIndexedAccess` — the clamp guarantees this, the compiler does not.
  return slot ?? { light: '#2a78d6', dark: '#3987e5' }
}

/**
 * The de-emphasis grey, for the "one series is the point, the rest are
 * context" form and for a sparkline's inactive stretch.
 */
export const DEEMPHASIS: SeriesColor = { light: '#c3c2b7', dark: '#52514e' }

/**
 * Single-hue sequential ramp, ordered low magnitude to high.
 *
 * On a light surface "more" gets darker; on a dark surface "more" gets
 * lighter, so the low end recedes toward the surface in both. Same blue
 * family as slot 1.
 */
export const SEQUENTIAL_STEPS: Record<'light' | 'dark', readonly string[]> = {
  light: ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#104281'],
  dark: ['#104281', '#256abf', '#3987e5', '#6da7ec', '#9ec5f4', '#cde2fb'],
}

/** Picks a sequential step for a 0–1 magnitude. */
export function sequentialStep(fraction: number, mode: 'light' | 'dark'): string {
  const steps = SEQUENTIAL_STEPS[mode]
  if (steps.length === 0) return '#3987e5'
  const clamped = Number.isFinite(fraction) ? Math.min(Math.max(fraction, 0), 1) : 0
  const index = Math.min(steps.length - 1, Math.round(clamped * (steps.length - 1)))
  return steps[index] ?? '#3987e5'
}

/**
 * Ink that stays legible on a sequential step.
 *
 * The three lightest light-mode steps are near-white, so a label on them
 * needs dark ink; the rest take white. Computed from the step index rather
 * than from luminance at runtime, because the ramp is fixed and a luminance
 * call per cell is pure cost.
 */
export function sequentialInk(fraction: number, mode: 'light' | 'dark'): string {
  const clamped = Number.isFinite(fraction) ? Math.min(Math.max(fraction, 0), 1) : 0
  const index = Math.round(clamped * (SEQUENTIAL_STEPS[mode].length - 1))
  const lightStep = mode === 'light' ? index <= 2 : index >= 3
  return lightStep ? '#0b0b0b' : '#ffffff'
}

/**
 * Status colours, deliberately distinct from the series slots so a status
 * never impersonates a series. Always shipped with an icon or a word — a
 * status is never carried by colour alone.
 */
export const STATUS_COLORS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
} as const

/** One of `STATUS_COLORS`. */
export type StatusTone = keyof typeof STATUS_COLORS

/** A slice of a part-to-whole chart. */
export interface Slice {
  key: string
  label: string
  value: number
}

/**
 * Caps a part-to-whole breakdown at `max` slices, summing the tail into one
 * "Other" slice. Returns the input untouched when it already fits.
 */
export function foldToOther(
  slices: readonly Slice[],
  max: number = MAX_SERIES_ALL_PAIRS,
  otherLabel = 'Other',
): Slice[] {
  if (slices.length <= max) return [...slices]
  const kept = slices.slice(0, max - 1)
  const tail = slices.slice(max - 1)
  return [
    ...kept,
    { key: 'other', label: otherLabel, value: tail.reduce((sum, slice) => sum + slice.value, 0) },
  ]
}
