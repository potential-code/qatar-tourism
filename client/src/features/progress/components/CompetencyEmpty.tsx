import { Compass } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { tr } from '@/i18n/localised'
import type { CompetencyDatum } from './CompetencyChart'

/** Friendly empty chart: what will be measured, and how to start, before any knowledge result. */
export function CompetencyEmpty({
  data,
  postLabel,
  action,
}: {
  data: readonly CompetencyDatum[]
  postLabel: string
  action?: ReactNode
}) {
  const { t, i18n } = useTranslation('learner')
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-teal/25 bg-teal-mist/40 px-5 py-8 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-white text-teal shadow-sm">
        <Compass aria-hidden className="size-5" />
      </span>
      <div className="flex max-w-md flex-col gap-1.5">
        <p className="font-display text-xl text-ink">{t('progress.chart.emptyTitle')}</p>
        <p className="text-sm text-muted-foreground">
          {t('progress.chart.emptyDescription', { post: postLabel.toLowerCase() })}
        </p>
      </div>
      {data.length > 0 ? (
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
            {t('progress.chart.measures')}
          </p>
          <ul className="flex flex-wrap justify-center gap-2">
            {data.map((row) => (
              <li
                key={row.key}
                className="rounded-full border border-teal/15 bg-white px-3 py-1 text-xs font-medium text-teal-deep"
              >
                {tr(row.label, i18n.language)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {action}
    </div>
  )
}
