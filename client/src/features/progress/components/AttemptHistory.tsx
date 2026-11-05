import type { ProgrammeCode } from '@shared/constants'
import { useQuery } from '@tanstack/react-query'
import { ClipboardCheck, ClipboardList, Hourglass } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '@/features/learning/components/LoadError'
import { tr } from '@/i18n/localised'
import { qatarDateTime } from '@/lib/format/qatar-time'
import { historyQuery } from '../queries/progress.queries'

/** Knowledge assessment attempts (brief §9: attempt history), separate from practice. */
export function AttemptHistory({ programme }: { programme: ProgrammeCode }) {
  const history = useQuery(historyQuery(programme))
  const { t, i18n } = useTranslation('learner')
  return (
    <section
      aria-labelledby="history-title"
      className="qt-card-elevated flex flex-col gap-5 rounded-xl p-5 md:p-7"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-teal-mist text-teal">
          <ClipboardCheck aria-hidden className="size-5" />
        </span>
        <div>
          <h2 id="history-title" className="font-display text-2xl font-normal text-ink">
            {t('progress.history.title')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('progress.history.subtitle')}</p>
        </div>
      </div>
      {history.isLoading ? (
        <Skeleton className="h-48 w-full rounded-lg" />
      ) : history.error || !history.data ? (
        <LoadError error={history.error} onRetry={() => void history.refetch()} />
      ) : history.data.items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          size="sm"
          title={t('progress.history.emptyTitle')}
          description={t('progress.history.emptyDescription')}
        />
      ) : (
        <section
          aria-label={t('progress.history.tableLabel')}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable table region must be reachable by keyboard
          tabIndex={0}
          className="overflow-x-auto rounded-lg border border-border/80 focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
        >
          <table className="w-full min-w-[32rem] text-sm">
            <thead className="bg-sand-deep/70 text-start text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
              <tr>
                <th scope="col" className="px-4 py-3 text-start font-medium">
                  {t('progress.history.assessment')}
                </th>
                <th scope="col" className="px-4 py-3 text-start font-medium">
                  {t('progress.history.attempt')}
                </th>
                <th scope="col" className="px-4 py-3 text-start font-medium">
                  {t('progress.history.score')}
                </th>
                <th scope="col" className="px-4 py-3 text-start font-medium">
                  {t('progress.history.version')}
                </th>
                <th scope="col" className="px-4 py-3 text-start font-medium">
                  {t('progress.history.date')}
                </th>
              </tr>
            </thead>
            <tbody>
              {history.data.items.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-border/70 transition-colors hover:bg-sand/70"
                >
                  <td className="px-4 py-3.5 font-medium text-ink">
                    {tr(row.title, i18n.language)}
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground tabular-nums">
                    #{row.attemptNo}
                  </td>
                  <td className="px-4 py-3.5">
                    {row.status === 'submitted' ? (
                      <ScoreCell score={row.score ?? 0} />
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-maroon-mist px-2.5 py-0.5 text-xs font-medium text-maroon">
                        <Hourglass aria-hidden className="size-3" />
                        {t('progress.history.inProgress')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="rounded-md bg-sand-deep px-2 py-0.5 text-xs font-medium text-ink">
                      {row.version}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-muted-foreground">
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

/** Score with a slim meter; the number carries the value, the meter is decoration. */
function ScoreCell({ score }: { score: number }) {
  return (
    <span className="flex items-center gap-3">
      <span className="w-10 font-medium text-ink tabular-nums">{score}%</span>
      <span aria-hidden className="relative h-1.5 w-16 overflow-hidden rounded-full bg-sand-deep">
        <span
          className="absolute inset-y-0 start-0 rounded-full bg-teal"
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </span>
    </span>
  )
}
