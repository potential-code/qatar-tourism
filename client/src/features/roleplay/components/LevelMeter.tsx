import { type MotionValue, motion, useReducedMotion, useTransform } from 'motion/react'

const BARS = 14

/** Live microphone level: bars scale with the input, driven by a motion value (no re-renders). */
export function LevelMeter({ level }: { level: MotionValue<number> }) {
  return (
    <div aria-hidden className="flex h-10 items-center gap-1">
      {Array.from({ length: BARS }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed decorative bars
        <Bar key={i} index={i} level={level} />
      ))}
    </div>
  )
}

function Bar({ index, level }: { index: number; level: MotionValue<number> }) {
  const reduce = useReducedMotion()
  // A gentle arch so the middle bars move most, like a voice waveform.
  const weight = 0.35 + 0.65 * Math.sin(((index + 0.5) / BARS) * Math.PI)
  const scaleY = useTransform(level, (v) =>
    reduce ? 0.4 : Math.max(0.12, Math.min(1, v * weight * 1.6)),
  )
  return (
    <motion.span style={{ scaleY }} className="h-full w-1.5 origin-center rounded-full bg-maroon" />
  )
}
