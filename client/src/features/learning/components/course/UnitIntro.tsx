import { CheckCircle2, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { tr } from '@/i18n/localised'
import type { Unit } from '../../types'
import { ItemIcon } from '../ItemIcon'

/** The player pane's heading: unit title, type chip, time, status and where it sits in the path. */
export function UnitIntro({
  unit,
  position,
  recommended,
}: {
  unit: Unit
  position: { n: number; total: number } | null
  recommended: boolean
}) {
  const { t } = useTranslation('learner')
  const completed = unit.progress.status === 'completed'
  return (
    <header className="flex flex-col gap-3 border-b border-border/70 pb-5">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-mist px-2.5 py-1 font-medium text-teal-deep">
          <ItemIcon kind="course" courseCode={unit.code} className="size-3.5" />
          {unit.code} · {unit.formatLabel}
        </span>
        {recommended ? (
          <span className="rounded-full bg-maroon-mist px-2.5 py-1 font-medium text-maroon-deep">
            {t('learning.card.recommended')}
          </span>
        ) : null}
        {position ? (
          <span className="text-muted-foreground tabular-nums">
            {t('learning.course.stepPosition', position)}
          </span>
        ) : null}
      </div>
      <h1 className="font-display text-3xl leading-tight font-normal text-ink md:text-4xl">
        {unit.title}
      </h1>
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
        {unit.summary}
      </p>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Clock aria-hidden className="size-4" />
          {t('learning.unit.minutes', { n: unit.durationMinutes })}
        </span>
        {completed ? (
          <span className="inline-flex items-center gap-1.5 font-medium text-teal-deep">
            <CheckCircle2 aria-hidden className="size-4" /> {t('learning.unit.complete')}
          </span>
        ) : (
          <span>{t('learning.unit.percentComplete', { n: unit.progress.percent })}</span>
        )}
      </div>
    </header>
  )
}

/** Completion rule and package format for the open unit. */
export function UnitAbout({ unit, lang }: { unit: Unit; lang: string }) {
  const { t } = useTranslation('learner')
  return (
    <section
      aria-labelledby="unit-about-title"
      className="rounded-xl border border-teal/10 bg-sand/60 p-5"
    >
      <h2 id="unit-about-title" className="mb-3 font-display text-xl font-normal text-ink">
        {t('learning.unit.about')}
      </h2>
      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">{t('learning.unit.completion')}</dt>
          <dd className="text-ink">{unit.completionText}</dd>
        </div>
        {unit.package ? (
          <div>
            <dt className="text-muted-foreground">{t('learning.unit.format')}</dt>
            <dd className="text-ink">
              {t('learning.unit.formatValue', {
                label: tr(unit.package.label, lang),
                version: unit.package.version,
              })}
            </dd>
          </div>
        ) : null}
      </dl>
    </section>
  )
}
