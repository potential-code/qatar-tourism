import { motion, useReducedMotion } from 'motion/react'

/** Shown while the assistant computes: says what it is doing, not just that it is busy. */
export function ThinkingIndicator() {
  const reduce = useReducedMotion()
  return (
    <div
      className="flex items-center gap-3 rounded-2xl rounded-ss-sm border bg-white px-4 py-3 text-sm text-muted-foreground shadow-xs"
      role="status"
    >
      <span className="flex gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-1.5 rounded-full bg-teal"
            animate={reduce ? undefined : { opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
            transition={{ duration: 0.9, repeat: Number.POSITIVE_INFINITY, delay: i * 0.15 }}
          />
        ))}
      </span>
      Reading the governed metrics
    </div>
  )
}
