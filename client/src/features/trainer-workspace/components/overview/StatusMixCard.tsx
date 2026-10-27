import { ChartCard } from '@/components/data/charts/ChartCard'
import { DonutChart } from '@/components/data/charts/DonutChart'
import { STATUS_LABEL } from '@/features/sessions/utils/session-labels'
import type { OverviewData } from '../../types'

/** Session states across the trainer's sessions (brief §10 states), with a text summary. */
export function StatusMixCard({ data }: { data: OverviewData }) {
  const slices = data.statusMix
    .filter((row) => row.total > 0)
    .map((row) => ({
      key: row.status,
      label: STATUS_LABEL[row.status as keyof typeof STATUS_LABEL],
      value: row.total,
    }))
  const total = slices.reduce((sum, s) => sum + s.value, 0)
  return (
    <ChartCard
      title="Your sessions by state"
      description={slices.map((s) => `${s.label} ${s.value}`).join(', ')}
      isEmpty={total === 0}
      emptyTitle="No sessions yet"
      height={220}
    >
      <DonutChart data={slices} height={220} centerValue={total} centerLabel="sessions" />
    </ChartCard>
  )
}
