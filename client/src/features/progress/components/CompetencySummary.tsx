import { useTranslation } from 'react-i18next'
import { tr } from '@/i18n/localised'
import type { CompetencyDatum } from './CompetencyChart'

const MAX = 20

/** Visible one-line reading of the competency chart (brief §2: text summaries for charts). */
export function CompetencySummary({
  data,
  postLabel,
}: {
  data: readonly CompetencyDatum[]
  postLabel: string
}) {
  const { t, i18n } = useTranslation('learner')
  const max = data.length * MAX
  const total = (key: 'baseline' | 'post') =>
    data.every((d) => d[key] === null) ? null : data.reduce((sum, d) => sum + (d[key] ?? 0), 0)
  const baseline = total('baseline')
  const post = total('post')
  const name = (row: CompetencyDatum | undefined) => (row ? tr(row.label, i18n.language) : '')

  const parts: string[] = []
  if (baseline !== null) {
    parts.push(
      t('progress.chart.summaryTotal', { series: t('progress.chart.baseline'), n: baseline, max }),
    )
  }
  if (post !== null) {
    parts.push(t('progress.chart.summaryTotal', { series: postLabel, n: post, max }))
    const gains = data
      .filter((d) => d.baseline !== null && d.post !== null)
      .map((d) => ({ row: d, gain: (d.post ?? 0) - (d.baseline ?? 0) }))
      .sort((a, b) => b.gain - a.gain)
    const top = gains[0]
    if (top && top.gain > 0) {
      parts.push(t('progress.chart.summaryGain', { name: name(top.row), n: top.gain }))
    }
  } else if (baseline !== null) {
    const focus = data.filter((d) => d.baseline !== null && d.baseline < MAX)
    if (focus.length > 0) {
      parts.push(t('progress.chart.summaryFocus', { names: focus.map(name).join(', ') }))
    }
  }
  if (parts.length === 0) return null
  return (
    <p className="rounded-lg bg-sand px-4 py-3 text-sm leading-relaxed text-ink">
      {parts.join(' ')}
    </p>
  )
}
