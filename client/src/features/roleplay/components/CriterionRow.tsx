import { Lightbulb, Quote } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { easeOut } from '@/components/motion/variants'
import { tr } from '@/i18n/localised'
import { cn } from '@/lib/utils'
import type { CriterionView } from '../types'

const MAX = 4

/** One rubric criterion: 0 to 4 as pips, the evidence quote and one improvement suggestion. */
export function CriterionRow({ criterion, index }: { criterion: CriterionView; index: number }) {
  const reduce = useReducedMotion()
  const { t, i18n } = useTranslation('learner')
  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, delay: index * 0.07, ease: easeOut }}
      className="grid gap-4 rounded-xl border bg-card p-5 shadow-xs md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
    >
      <div className="grid content-start gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-medium text-ink">{tr(criterion.label, i18n.language)}</h3>
          <span className="font-display text-2xl tabular-nums text-ink">
            {criterion.score}
            <span className="text-sm text-muted-foreground">/{MAX}</span>
          </span>
        </div>
        <span className="sr-only">
          {t('roleplay.criterion.outOf', { score: criterion.score, max: MAX })}
        </span>
        <div aria-hidden className="grid grid-cols-4 gap-1.5">
          {Array.from({ length: MAX }, (_, i) => (
            <motion.span
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed positions
              key={i}
              initial={reduce ? false : { scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2 + index * 0.07 + i * 0.08, ease: easeOut }}
              className={cn(
                'h-2.5 origin-left rounded-full rtl:origin-right',
                i < criterion.score ? 'bg-teal' : 'bg-teal-mist',
              )}
            />
          ))}
        </div>
      </div>
      <div className="grid gap-3">
        <blockquote className="flex gap-2 rounded-lg bg-sand-deep/60 px-3 py-2.5 text-sm text-ink">
          <Quote aria-hidden className="mt-0.5 size-3.5 shrink-0 text-maroon/60" />
          <span>
            <span className="sr-only">{t('roleplay.criterion.evidence')}</span>“{criterion.evidence}
            ”
          </span>
        </blockquote>
        <p className="flex gap-2 text-sm text-muted-foreground">
          <Lightbulb aria-hidden className="mt-0.5 size-4 shrink-0 text-teal" />
          <span>
            <span className="sr-only">{t('roleplay.criterion.suggestion')}</span>
            {criterion.suggestion}
          </span>
        </p>
      </div>
    </motion.li>
  )
}
