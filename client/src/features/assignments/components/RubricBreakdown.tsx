import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { easeOut } from '@/components/motion/variants'
import { tr } from '@/i18n/localised'
import type { RubricItem } from '../types'

interface RubricBreakdownProps {
  rubric: RubricItem[]
  breakdown: Record<string, number> | null
}

/** The trainer's mark per rubric part, as numbers with a short bar each. */
export function RubricBreakdown({ rubric, breakdown }: RubricBreakdownProps) {
  const reduce = useReducedMotion()
  const { t, i18n } = useTranslation('learner')
  if (!breakdown) {
    return <p className="text-sm text-muted-foreground">{t('assignments.rubric.overall')}</p>
  }
  return (
    <dl className="grid gap-3">
      {rubric.map((item, i) => {
        const value = breakdown[item.key] ?? 0
        return (
          <div key={item.key} className="grid gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <dt className="text-ink">{tr(item.label, i18n.language)}</dt>
              <dd className="tabular-nums text-muted-foreground">
                <span className="font-medium text-ink">{value}</span>/{item.max}
              </dd>
            </div>
            <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-teal-mist">
              <motion.div
                initial={reduce ? false : { scaleX: 0 }}
                whileInView={{ scaleX: value / item.max }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: i * 0.08, ease: easeOut }}
                style={reduce ? { transform: `scaleX(${value / item.max})` } : undefined}
                className="h-full origin-left rounded-full bg-teal rtl:origin-right"
              />
            </div>
          </div>
        )
      })}
    </dl>
  )
}
