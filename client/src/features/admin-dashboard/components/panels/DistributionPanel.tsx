import { PROGRAMME_LABELS } from '@shared/schemas/admin-labels'
import { ColumnChart } from '@/components/data'
import type { Overview } from '../../queries/analytics.queries'
import { count } from '../../utils/format'
import { PanelCard } from '../PanelCard'

/** Brief §12: enrolments by A/B/C with count labels, and a separate unique learner count. */
export function DistributionPanel({ data }: { data: Overview }) {
  const series = data.distribution.map((d) => ({
    label: PROGRAMME_LABELS[d.programme],
    value: d.enrolments,
  }))
  return (
    <PanelCard
      title="Programme distribution"
      description="Enrolments by programme. A learner in two programmes counts once per programme."
      info={{
        label: data.definitions.enrolments.label,
        definition: data.definitions.enrolments.definition,
      }}
      className="col-span-5"
    >
      <ColumnChart data={series} label="Enrolments" height={230} />
      <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-4">
        <div>
          <p className="text-xs text-muted-foreground">Programme enrolments</p>
          <p className="font-display text-2xl tabular-nums text-ink">
            {count(data.kpis.enrolments)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Unique learners (no double counting)</p>
          <p className="font-display text-2xl tabular-nums text-teal-deep">
            {count(data.kpis.uniqueLearners)}
          </p>
        </div>
      </div>
      <p className="sr-only">{series.map((s) => `${s.label}: ${s.value} enrolments.`).join(' ')}</p>
    </PanelCard>
  )
}
