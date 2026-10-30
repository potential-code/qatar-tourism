import { useTranslation } from 'react-i18next'
import { tr } from '@/i18n/localised'
import type { RubricItem } from '../types'
import '@/features/roleplay/utils/arabic-copy'

/** What the trainer marks, so the learner can plan against it. */
export function MarkingCriteria({ rubric }: { rubric: RubricItem[] }) {
  const { t, i18n } = useTranslation('learner')
  return (
    <section
      aria-labelledby="criteria-heading"
      className="grid gap-3 rounded-xl border bg-card p-5 shadow-xs"
    >
      <h2 id="criteria-heading" className="font-display text-xl font-light text-ink">
        {t('assignments.criteria.title')}
      </h2>
      <ul className="grid gap-2">
        {rubric.map((item) => (
          <li key={item.key} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-ink">{tr(item.label, i18n.language)}</span>
            <span className="tabular-nums text-muted-foreground">
              {t('assignments.criteria.points', { n: item.max })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
