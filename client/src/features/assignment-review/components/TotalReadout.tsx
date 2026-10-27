import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'

/** Live total out of 100 with the pass mark, in words as well as colour. */
export function TotalReadout({ total, passPercent }: { total: number; passPercent: number }) {
  const reduce = useReducedMotion()
  const value = useMotionValue(total)
  const text = useTransform(value, (v) => Math.round(v).toString())
  useEffect(() => {
    if (reduce) {
      value.set(total)
      return
    }
    const controls = animate(value, total, { duration: 0.35, ease: [0.22, 1, 0.36, 1] })
    return () => controls.stop()
  }, [total, reduce, value])
  const pass = total >= passPercent
  return (
    <div className="flex items-end justify-between gap-3 rounded-xl bg-sand-deep/60 p-4">
      <div className="grid gap-0.5">
        <span className="text-xs text-muted-foreground">Total</span>
        <span
          className="font-display text-5xl leading-none font-light tabular-nums text-ink"
          aria-live="polite"
        >
          <motion.span>{text}</motion.span>
          <span className="text-xl text-muted-foreground">/100</span>
        </span>
      </div>
      <span
        className={cn(
          'rounded-full px-2.5 py-1 text-xs font-medium',
          pass ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning',
        )}
      >
        {pass ? `Meets pass mark of ${passPercent}` : `Below pass mark of ${passPercent}`}
      </span>
    </div>
  )
}
