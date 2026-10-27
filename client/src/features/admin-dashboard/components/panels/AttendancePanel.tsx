import { Meter, ProgressRing } from '@/components/data'
import type { Overview } from '../../queries/analytics.queries'
import { count } from '../../utils/format'
import { PanelCard } from '../PanelCard'

/** Operational panel: attendance rate overall and by delivery format. */
export function AttendancePanel({ data, onOpen }: { data: Overview; onOpen: () => void }) {
  const { rate, present, due, byFormat } = data.attendance
  return (
    <PanelCard
      title="Attendance rate"
      description="Due, non-cancelled bookings for learners in this cohort."
      info={{
        label: data.definitions.attendanceRate.label,
        definition: data.definitions.attendanceRate.definition,
      }}
      className="col-span-5"
    >
      <div className="flex items-center gap-6">
        <ProgressRing value={rate} size={132} strokeWidth={11} label="Attended" />
        <div>
          <p className="font-display text-3xl tabular-nums text-ink">
            {count(present)}
            <span className="text-lg text-muted-foreground"> of {count(due)}</span>
          </p>
          <p className="text-sm text-muted-foreground">bookings attended or late</p>
        </div>
      </div>
      <div className="mt-6 grid gap-4">
        {byFormat.map((f) => (
          <Meter
            key={f.format}
            label={f.label}
            value={f.present}
            max={f.due || 1}
            tone="neutral"
            toneLabel={f.due ? undefined : 'No bookings due'}
            caption={`${count(f.present)} of ${count(f.due)} due · ${f.absent} absent · ${f.excused} excused`}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="mt-auto self-start pt-5 text-sm font-medium text-teal underline-offset-4 hover:underline"
      >
        Open Sessions and attendance report
      </button>
    </PanelCard>
  )
}
