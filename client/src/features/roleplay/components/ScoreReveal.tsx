import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { easeOut } from '@/components/motion/variants'
import type { AttemptView } from '../types'
import { scoreBand } from '../utils/labels'

const SIZE = 184
const STROKE = 12
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** Animated score ring and the brief's summary lines: strength, improve, suggested retry. */
export function ScoreReveal({ attempt }: { attempt: AttemptView }) {
  const reduce = useReducedMotion()
  const { t, i18n } = useTranslation('learner')
  const progress = useMotionValue(reduce ? attempt.totalPercent : 0)
  const offset = useTransform(progress, (v) => CIRCUMFERENCE * (1 - v / 100))
  const label = useTransform(progress, (v) => Math.round(v).toString())
  const band = scoreBand(attempt.totalPercent)
  const dir = i18n.dir()

  useEffect(() => {
    if (reduce) {
      progress.set(attempt.totalPercent)
      return
    }
    const controls = animate(progress, attempt.totalPercent, {
      duration: 1.4,
      ease: easeOut,
      delay: 0.2,
    })
    return () => controls.stop()
  }, [attempt.totalPercent, progress, reduce])

  const lines = [
    { label: t('roleplay.score.strength'), text: attempt.strength },
    { label: t('roleplay.score.improve'), text: attempt.improve },
    { label: t('roleplay.score.retry'), text: attempt.retry },
  ]

  return (
    <div className="grid items-center gap-8 md:grid-cols-[auto_minmax(0,1fr)]">
      <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="-rotate-90"
          aria-hidden
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            className="stroke-teal-mist"
          />
          <motion.circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            style={{ strokeDashoffset: offset }}
            className="stroke-teal"
          />
        </svg>
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          role="img"
          aria-label={t('roleplay.score.aria', {
            score: attempt.totalPercent,
            band: t(`roleplay.bands.${band.key}`),
          })}
        >
          <motion.span className="font-display text-6xl leading-none font-light tabular-nums text-ink">
            {label}
          </motion.span>
          <span className="mt-1 text-xs text-muted-foreground">{t('roleplay.score.outOf')}</span>
          <span className="mt-2 rounded-full bg-teal-mist px-2.5 py-0.5 text-xs font-medium text-teal-deep">
            {t(`roleplay.bands.${band.key}`)}
          </span>
        </div>
      </div>
      <div className="grid gap-4">
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5, ease: easeOut }}
          className="font-display text-2xl leading-snug font-light text-ink md:text-3xl"
        >
          {attempt.totalScore}/20 = {attempt.totalPercent}/100
        </motion.p>
        <dl className="grid gap-3">
          {lines.map((line, i) => (
            <motion.div
              key={line.label}
              initial={reduce ? false : { opacity: 0, x: dir === 'rtl' ? 8 : -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + i * 0.12, duration: 0.45, ease: easeOut }}
              className="grid gap-0.5 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-3"
            >
              <dt className="text-sm font-medium text-teal-deep">{line.label}:</dt>
              <dd className="text-[15px] text-ink">{line.text}</dd>
            </motion.div>
          ))}
        </dl>
      </div>
    </div>
  )
}
