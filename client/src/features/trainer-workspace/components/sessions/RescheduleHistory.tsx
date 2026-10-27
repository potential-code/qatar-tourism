import { History } from 'lucide-react'
import { qatarDateTime } from '@/features/sessions/utils/qatar-time'
import type { SessionDetailData } from '../../types'

/** The separate reschedule history (brief §10, §17): the ID stays, the times move. */
export function RescheduleHistory({
  history,
}: {
  history: SessionDetailData['rescheduleHistory']
}) {
  return (
    <section
      className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-xs"
      aria-labelledby="history-heading"
    >
      <h2
        id="history-heading"
        className="flex items-center gap-2 font-display text-xl font-normal text-ink"
      >
        <History aria-hidden className="size-5 text-teal" /> Reschedule history
      </h2>
      {history.length === 0 ? (
        <p className="text-sm text-muted-foreground">This session has kept its original time.</p>
      ) : (
        <ol className="relative flex flex-col gap-4 border-s ps-5">
          {history.map((h) => (
            <li key={h.id} className="relative text-sm">
              <span
                aria-hidden
                className="absolute -start-[25px] top-1.5 size-2.5 rounded-full bg-maroon ring-4 ring-card"
              />
              <p className="font-medium text-ink">{qatarDateTime(h.at)}</p>
              <p className="text-ink-soft">
                From {qatarDateTime(h.previousStartsAt)} to {qatarDateTime(h.newStartsAt)}
              </p>
              {h.previousVenue !== h.newVenue ? (
                <p className="text-warning">
                  Location changed: {h.previousVenue ?? 'none'} to {h.newVenue ?? 'none'}
                </p>
              ) : null}
              <p className="text-muted-foreground">Reason: {h.reason}</p>
              <p className="text-muted-foreground">
                {h.affectedRsvps} learners notified. Event {h.eventId}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
