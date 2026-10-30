import { useTranslation } from 'react-i18next'

/**
 * Baseline against the counted score, with "Improvement: N percentage points" in words (the
 * number is never the only cue). Matched attempts only.
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
  return (
    <section
      aria-labelledby="comparison-title"
      className="grid gap-4 rounded-xl bg-teal-deep p-6 text-white shadow-md sm:grid-cols-3"
    >
      <h2 id="comparison-title" className="sr-only">
        {t('comparison.title')}
      </h2>
      <div>
        <p className="text-sm text-white/70">{t('comparison.baseline')}</p>
        <p className="font-display text-5xl font-light tabular-nums" dir="ltr">
          {comparison.baseline}%
        </p>
      </div>
      <div>
        <p className="text-sm text-white/70">
          {programme === 'A' ? t('comparison.final') : t('comparison.post')}
        </p>
        <p className="font-display text-5xl font-light tabular-nums" dir="ltr">
          {comparison.post}%
        </p>
      </div>
      <div>
        <p className="text-sm text-white/70">{t('comparison.improvement')}</p>
        <p className="font-display text-2xl leading-tight font-light text-teal-soft">
          {t('comparison.improvementValue', { points: comparison.gainPoints })}
        </p>
      </div>
      <p className="text-sm text-white/75 sm:col-span-3">
        {t('comparison.note', { policy: t(`policy.${policy}`) })}
      </p>
    </section>
  )
}
