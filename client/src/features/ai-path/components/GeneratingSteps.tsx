import type { ProgrammeCode } from '@shared/constants'
import { Check, LoaderCircle } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { easeOut } from '@/components/motion/variants'
import { cn } from '@/lib/utils'

const STEPS = ['profile', 'baseline', 'paths', 'gates'] as const

/**
 * A short, honest generation sequence: each line is a real step of the scripted logic. Program B
 * is one stage with no levels, so its last step checks required and recommended units instead.
 */
export function GeneratingSteps({
  programme,
  onDone,
}: {
  programme: ProgrammeCode
  onDone: () => void
}) {
  const { t, i18n } = useTranslation('learner')
  const reduce = useReducedMotion()
  // Lines enter from the reading start: the left in English, the right in Arabic.
  const enterFrom = i18n.dir() === 'rtl' ? 8 : -8
  const [done, setDone] = useState(reduce ? STEPS.length : 0)

  useEffect(() => {
    if (done >= STEPS.length) {
      const t = window.setTimeout(onDone, reduce ? 0 : 350)
      return () => window.clearTimeout(t)
    }
    const t = window.setTimeout(() => setDone((d) => d + 1), 520)
    return () => window.clearTimeout(t)
  }, [done, onDone, reduce])

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col gap-4 rounded-xl border bg-white p-6 shadow-sm md:p-8"
    >
      <p className="font-display text-2xl text-ink">{t('aiPath.building')}</p>
      <div className="h-1 overflow-hidden rounded-full bg-teal-mist">
        <motion.div
          className="h-full origin-left rtl:origin-right rounded-full bg-teal"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: done / STEPS.length }}
          transition={{ duration: 0.45, ease: easeOut }}
        />
      </div>
      <ol className="flex flex-col gap-3">
        {STEPS.map((step, i) => (
          <motion.li
            key={step}
            initial={reduce ? false : { opacity: 0, x: enterFrom }}
            animate={{ opacity: i <= done ? 1 : 0.35, x: 0 }}
            transition={{ duration: 0.3, ease: easeOut }}
            className={cn(
              'flex items-center gap-3 text-sm',
              i < done ? 'text-ink' : 'text-muted-foreground',
            )}
          >
            <span className="grid size-6 place-items-center rounded-full bg-teal-mist text-teal">
              {i < done ? (
                <Check aria-hidden className="size-3.5" />
              ) : i === done ? (
                <LoaderCircle
                  aria-hidden
                  className="size-3.5 animate-spin motion-reduce:animate-none"
                />
              ) : null}
            </span>
            {step === 'gates' && programme === 'B'
              ? t('aiPath.steps.gatesB')
              : t(`aiPath.steps.${step}`)}
          </motion.li>
        ))}
      </ol>
    </div>
  )
}
