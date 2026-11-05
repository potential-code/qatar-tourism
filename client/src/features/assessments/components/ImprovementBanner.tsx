import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { easeOut } from '@/components/motion/variants'
import { cn } from '@/lib/utils'

/**
 * Baseline against the counted score, with "Improvement: N percentage points" in words (the
 * number is never the only cue). Matched attempts only. The two bars are decorative: the values
 * are written out above them.
 */
export function ImprovementBanner({
  comparison,
  programme,
  policy,
}: {
  comparison: { baseline: number; post: number; gainPoints: number }
  programme: string
  policy: 'best' | 'latest'
}) {
  const { t } = useTranslation('assessments')
  const reduce = useReducedMotion()
  const up = comparison.gainPoints >= 0
  const Trend = up ? TrendingUp : TrendingDown
  const bars = [
    { key: 'baseline', value: comparison.baseline, tone: 'bg-teal-soft' },
    { key: 'post', value: comparison.post, tone: 'bg-teal' },
  ]
  return (
    <section
      aria-labelledby="comparison-title"
      className="qt-card-elevated flex flex-col gap-6 rounded-xl p-6 md:p-8"
    >
      <h2 id="comparison-title" className="font-display text-2xl font-normal text-ink">
        {t('comparison.title')}
      </h2>
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-4 sm:grid-cols-[auto_auto_auto_1fr] sm:gap-8">
        <div>
          <p className="text-sm text-muted-foreground">{t('comparison.baseline')}</p>
          <p className="font-display text-5xl font-light text-ink/70 tabular-nums" dir="ltr">
            {comparison.baseline}%
          </p>
        </div>
        <ArrowRight aria-hidden className="mb-3 size-6 text-teal rtl:-scale-x-100" />
        <div>
          <p className="text-sm text-muted-foreground">
            {programme === 'A' ? t('comparison.final') : t('comparison.post')}
          </p>
          <p className="font-display text-5xl font-light text-teal-deep tabular-nums" dir="ltr">
            {comparison.post}%
          </p>
        </div>
        <div className="col-span-3 sm:col-span-1 sm:justify-self-end">
          <p
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-4 py-2 font-medium',
              up ? 'bg-teal-mist text-teal-deep' : 'bg-maroon-mist text-maroon-deep',
            )}
          >
            <Trend aria-hidden className="size-5 shrink-0" />
            {t('comparison.improvementValue', { points: comparison.gainPoints })}
          </p>
        </div>
      </div>
      <div aria-hidden className="flex flex-col gap-2">
        {bars.map((b, i) => (
          <div key={b.key} className="h-2.5 overflow-hidden rounded-full bg-ink/10">
            <motion.div
              className={cn('h-full origin-left rounded-full rtl:origin-right', b.tone)}
              style={{ width: `${Math.max(0, Math.min(100, b.value))}%` }}
              initial={reduce ? false : { scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, ease: easeOut, delay: 0.2 + i * 0.15 }}
            />
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {t('comparison.note', { policy: t(`policy.${policy}`) })}
      </p>
    </section>
  )
}
