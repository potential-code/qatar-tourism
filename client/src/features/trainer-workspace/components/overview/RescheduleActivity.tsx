import { History } from 'lucide-react'
import { CornerPattern } from '@/components/brand/CornerPattern'
import { qatarDateTime } from '@/lib/format/qatar-time'
import type { OverviewData } from '../../types'

/** Recent reschedules of the trainer's sessions: the separate history the brief asks for. */
export function RescheduleActivity({ data }: { data: OverviewData }) {
  if (data.reschedules.length === 0) return null
  return (
    <section
      className="relative isolate overflow-hidden flex flex-col gap-3 rounded-xl border bg-gradient-to-br from-white to-sky-mist p-5 md:p-6"
      aria-labelledby="resched-heading"
    >
      <CornerPattern side="a" />
      <h2
        id="resched-heading"
        className="flex items-center gap-2 font-display text-2xl font-light text-ink"
      >
        <History aria-hidden className="size-5 text-teal" /> Reschedule history
      </h2>
      <ul className="flex flex-col gap-3">
        {data.reschedules.map((r) => (
          <li key={r.id} className="rounded-lg bg-sand p-3 text-sm">
            <p className="font-medium text-ink">
              {r.sessionTitle}{' '}
              <span className="font-normal text-muted-foreground">({r.sessionCode})</span>
            </p>
            <p className="text-ink-soft">
              {qatarDateTime(r.previousStartsAt)} moved to {qatarDateTime(r.newStartsAt)}
            </p>
            <p className="text-muted-foreground">
              {r.affected} learners notified. Reason: {r.reason}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
