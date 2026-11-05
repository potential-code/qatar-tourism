import { motion, useReducedMotion } from 'motion/react'
import { useId } from 'react'
import { CountUp } from '@/components/motion/CountUp'
import { easeOut } from '@/components/motion/variants'

const SIZE = 176
const STROKE = 12
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const TICKS = 40

/**
 * The result score on a dark ground: a clearly visible track (so 0% still reads as a ring), a
 * fine tick dial, and an arc that sweeps in from the top. The number counts up. With reduced
 * motion the arc and number appear at their final values. Always sweeps clockwise (`dir="ltr"`).
 */
export function ScoreRing({ value, label }: { value: number; label: string }) {
  const reduce = useReducedMotion()
  const gradient = `score-${useId().replace(/:/g, '')}`
  const ratio = Math.min(100, Math.max(0, value)) / 100
  const offset = CIRCUMFERENCE * (1 - ratio)
  return (
    <div
      role="img"
      aria-label={label}
      className="relative grid size-44 shrink-0 place-items-center"
      dir="ltr"
    >
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        aria-hidden="true"
        focusable="false"
        className="absolute inset-0 size-full -rotate-90"
      >
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--qt-teal-soft)" />
            <stop offset="100%" stopColor="white" />
          </linearGradient>
        </defs>
        {Array.from({ length: TICKS }, (_, i) => {
          const angle = (i / TICKS) * 2 * Math.PI
          const inner = RADIUS - STROKE - 4
          const outer = inner - (i % 5 === 0 ? 6 : 3)
          return (
            <line
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed decorative dial
              key={i}
              x1={SIZE / 2 + inner * Math.cos(angle)}
              y1={SIZE / 2 + inner * Math.sin(angle)}
              x2={SIZE / 2 + outer * Math.cos(angle)}
              y2={SIZE / 2 + outer * Math.sin(angle)}
              className="stroke-white/25"
              strokeWidth={1}
            />
          )
        })}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          className="stroke-white/20"
        />
        {ratio > 0 ? (
          <motion.circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={`url(#${gradient})`}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            initial={{ strokeDashoffset: reduce ? offset : CIRCUMFERENCE }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: reduce ? 0 : 1.2, ease: easeOut, delay: reduce ? 0 : 0.2 }}
          />
        ) : null}
      </svg>
      <span className="relative font-display text-5xl font-light text-white tabular-nums">
        <CountUp value={value} suffix="%" />
      </span>
    </div>
  )
}
