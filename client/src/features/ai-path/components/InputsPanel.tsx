import { BriefcaseBusiness, ClipboardCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { tr } from '@/i18n/localised'
import { cn } from '@/lib/utils'
import type { Recommendation } from '../types'
import { experienceLabel, orgTypeLabel, valueLabel } from '../utils/labels'

/** What the generator reads (brief §9 inputs): profile plus baseline competency scores. */
export function InputsPanel({ data }: { data: Recommendation }) {
  const { t, i18n } = useTranslation('learner')
  const { inputs } = data
  const rows: [string, string][] = [
    [
      t('aiPath.inputs.programme'),
      t('aiPath.inputs.programmeValue', {
        programme: inputs.programme,
        title: tr(data.programmeTitle, i18n.language),
      }),
    ],
    [t('aiPath.inputs.jobTitle'), inputs.jobTitle ?? t('aiPath.inputs.notGiven')],
    [t('aiPath.inputs.jobFunction'), valueLabel(inputs.jobFunction)],
    [t('aiPath.inputs.orgType'), orgTypeLabel(inputs.organisationType)],
    [t('aiPath.inputs.seniority'), valueLabel(inputs.seniority)],
    [t('aiPath.inputs.experience'), experienceLabel(inputs.experience)],
    [
      t('aiPath.inputs.goals'),
      inputs.goals.length > 0
        ? inputs.goals.map(valueLabel).join(i18n.language === 'ar' ? '، ' : ', ')
        : t('aiPath.inputs.notGiven'),
    ],
    [
      t('aiPath.inputs.time'),
      inputs.weeklyMinutes
        ? t('aiPath.inputs.minutesAWeek', { n: inputs.weeklyMinutes })
        : t('aiPath.inputs.notGiven'),
    ],
  ]
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section
        aria-labelledby="inputs-profile"
        className="rounded-xl border bg-white p-5 shadow-xs"
      >
        <h2 id="inputs-profile" className="mb-4 flex items-center gap-2 font-medium text-ink">
          <BriefcaseBusiness aria-hidden className="size-4 text-teal" />{' '}
          {t('aiPath.inputs.profile')}
          {inputs.profileComplete ? null : (
            <span className="rounded-full bg-maroon-mist px-2 py-0.5 text-xs text-maroon-deep">
              {t('aiPath.inputs.incomplete')}
            </span>
          )}
        </h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section
        aria-labelledby="inputs-baseline"
        className="rounded-xl border bg-white p-5 shadow-xs"
      >
        <h2 id="inputs-baseline" className="mb-4 flex items-center gap-2 font-medium text-ink">
          <ClipboardCheck aria-hidden className="size-4 text-teal" /> {t('aiPath.inputs.baseline')}
          {inputs.baseline ? (
            <span className="ms-auto font-display text-2xl font-normal tabular-nums">
              {inputs.baseline.score}%
            </span>
          ) : null}
        </h2>
        {inputs.baseline ? (
          <ul className="flex flex-col gap-2.5">
            {inputs.baseline.competencies.map((c) => (
              <li key={c.key} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-ink">{tr(c.label, i18n.language)}</span>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-xs font-medium',
                    c.score > 0 ? 'bg-teal-mist text-teal-deep' : 'bg-maroon-mist text-maroon-deep',
                  )}
                >
                  {c.score > 0 ? t('aiPath.inputs.strong') : t('aiPath.inputs.gap')} · {c.score}/20
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t('aiPath.inputs.noBaseline')}</p>
        )}
      </section>
    </div>
  )
}
