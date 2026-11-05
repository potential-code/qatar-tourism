import { ArrowUpRight, Minus } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { easeOut } from '@/components/motion/variants'
import { tr } from '@/i18n/localised'
import { cn } from '@/lib/utils'
import { CompetencyEmpty } from './CompetencyEmpty'
import { CompetencySummary } from './CompetencySummary'

export type CompetencyDatum = {
  key: string
  label: string
  baseline: number | null
  post: number | null
  foundation?: number | null
}

export type SeriesKey = 'baseline' | 'foundation' | 'post'

type Series = {
  key: SeriesKey
  labelKey: 'progress.chart.baseline' | 'progress.chart.foundation' | null
  bar: string
}

/** Points per competency in one knowledge assessment. */
const MAX_POINTS = 20

// RTL decision: these are CSS bars, not a recharts chart. The bar grows from the start edge
// (`origin-left`, `rtl:origin-right`), so in Arabic the scale mirrors and each row still reads
// from its label outwards. Points beside the bars sit in a dir="ltr" span so "0 / 20" never flips.
const barClass = 'absolute inset-y-0 start-0 w-full origin-left rounded-full rtl:origin-right'

const SERIES: Series[] = [
  { key: 'baseline', labelKey: 'progress.chart.baseline', bar: 'bg-teal-soft' },
  { key: 'foundation', labelKey: 'progress.chart.foundation', bar: 'bg-maroon/70' },
  { key: 'post', labelKey: null, bar: 'bg-grad-teal' },
]

/**
 * Competency comparison (brief §5 dashboard, §8). Each bar is printed with its points, a gain
 * chip names the change in words and numbers, a visible summary sentence describes the chart, and
 * a table carries the same data for assistive technology (status never by colour alone).
 */
export function CompetencyChart({
  data,
  postLabel = 'Post',
  showFoundation = false,
  emptyAction,
  className,
}: {
  data: readonly CompetencyDatum[]
  postLabel?: string
  showFoundation?: boolean
  /** Call to action under the empty state (e.g. a link to assessments). */
  emptyAction?: ReactNode
  className?: string
}) {
  const reduce = useReducedMotion()
  const { t, i18n } = useTranslation('learner')
  const series = SERIES.filter((s) => s.key !== 'foundation' || showFoundation).map((s) => ({
    ...s,
    label: s.labelKey ? t(s.labelKey) : postLabel,
  }))
  const hasPost = data.some((d) => d.post !== null)
  const hasAny = data.some((d) => series.some((s) => (d[s.key] ?? null) !== null))

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      {hasAny ? (
        <>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground" aria-hidden>
            {series.map((s) => (
              <li key={s.key} className="inline-flex items-center gap-2">
                <span className={cn('h-2.5 w-5 rounded-full', s.bar)} />
                {s.label}
              </li>
            ))}
          </ul>
          <div className="flex flex-col divide-y divide-border/70" aria-hidden>
            {data.map((row, rowIndex) => {
              const gain =
                row.baseline !== null && row.post !== null ? row.post - row.baseline : null
              return (
                <div
                  key={row.key}
                  className="grid gap-2 py-3.5 first:pt-0 last:pb-0 sm:grid-cols-[12rem_1fr] sm:items-center sm:gap-6"
                >
                  <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-start">
                    <p className="text-sm font-medium text-ink">{tr(row.label, i18n.language)}</p>
                    {gain !== null ? <GainChip gain={gain} /> : null}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {series.map((s) => {
                      const value = row[s.key] ?? null
                      return (
                        <div key={s.key} className="flex items-center gap-3">
                          <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-sand-deep">
                            {value !== null && value > 0 ? (
                              reduce ? (
                                <span
                                  className={cn(barClass, s.bar)}
                                  style={{ transform: `scaleX(${value / MAX_POINTS})` }}
                                />
                              ) : (
                                <motion.span
                                  className={cn(barClass, s.bar)}
                                  initial={{ scaleX: 0 }}
                                  whileInView={{ scaleX: value / MAX_POINTS }}
                                  viewport={{ once: true, amount: 0.6 }}
                                  transition={{
                                    duration: 0.7,
                                    ease: easeOut,
                                    delay: rowIndex * 0.06,
                                  }}
                                />
                              )
                            ) : null}
                          </div>
                          <span
                            className={cn(
                              'w-20 shrink-0 text-end text-xs tabular-nums',
                              value === null
                                ? 'text-muted-foreground italic'
                                : 'font-medium text-ink',
                            )}
                          >
                            {value === null ? (
                              t('progress.chart.notYet')
                            ) : (
                              <span dir="ltr">{t('progress.chart.pointsOf', { n: value })}</span>
                            )}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
          <CompetencySummary data={data} postLabel={postLabel} />
        </>
      ) : (
        <CompetencyEmpty data={data} postLabel={postLabel} action={emptyAction} />
      )}
      <div className="sr-only">
        <table>
          <caption>
            {hasPost
              ? t('progress.chart.captionCompared', { post: postLabel.toLowerCase() })
              : t('progress.chart.caption')}
          </caption>
          <thead>
            <tr>
              <th scope="col">{t('progress.chart.competency')}</th>
              {series.map((s) => (
                <th key={s.key} scope="col">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.key}>
                <th scope="row">{tr(row.label, i18n.language)}</th>
                {series.map((s) => (
                  <td key={s.key}>{row[s.key] ?? t('progress.chart.notTaken')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Change from baseline to post, in words and numbers so it never relies on colour. */
function GainChip({ gain }: { gain: number }) {
  const { t } = useTranslation('learner')
  const Icon = gain > 0 ? ArrowUpRight : Minus
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums',
        gain > 0 ? 'bg-teal-mist text-teal-deep' : 'bg-sand-deep text-muted-foreground',
      )}
    >
      <Icon aria-hidden className="size-3 rtl:-scale-x-100" />
      {gain > 0
        ? t('progress.chart.gain', { n: gain })
        : gain === 0
          ? t('progress.chart.noChange')
          : t('progress.chart.loss', { n: Math.abs(gain) })}
    </span>
  )
}
