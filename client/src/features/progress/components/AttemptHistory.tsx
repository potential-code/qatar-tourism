import type { ProgrammeCode } from '@shared/constants'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '@/features/learning/components/LoadError'
import { qatarDateTime } from '@/lib/format/qatar-time'
import { historyQuery } from '../queries/progress.queries'

/** Knowledge assessment attempts (brief §9: attempt history), separate from practice. */
export function AttemptHistory({ programme }: { programme: ProgrammeCode }) {
  const history = useQuery(historyQuery(programme))
  return (
    <section
      aria-labelledby="history-title"
      className="flex flex-col gap-4 rounded-xl border bg-white p-6 shadow-sm"
    >
      <div>
        <h2 id="history-title" className="font-display text-2xl font-normal text-ink">
          Knowledge assessments
        </h2>
        <p className="text-sm text-muted-foreground">
          Every attempt, newest first. Times in Qatar time.
        </p>
      </div>
      {history.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : history.error || !history.data ? (
        <LoadError error={history.error} onRetry={() => void history.refetch()} />
      ) : history.data.items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          size="sm"
          title="No attempts yet"
          description="Your baseline will appear here once you take it."
        />
      ) : (
        <section
          aria-label="Assessment attempts"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable table region must be reachable by keyboard
          tabIndex={0}
          className="overflow-x-auto rounded-lg border focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
        >
          <table className="w-full min-w-[32rem] text-sm">
            <thead className="bg-sand text-start text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">
                  Assessment
                </th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">
                  Attempt
                </th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">
                  Score
                </th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">
                  Version
                </th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {history.data.items.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-4 py-3 font-medium text-ink">{row.title}</td>
                  <td className="px-4 py-3 tabular-nums">{row.attemptNo}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {row.status === 'submitted' ? (
                      `${row.score}%`
                    ) : (
                      <span className="text-maroon">In progress</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{row.version}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {qatarDateTime(row.submittedAt ?? row.startedAt, { year: false, label: false })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </section>
  )
}
