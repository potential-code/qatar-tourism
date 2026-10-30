import type { ProgrammeCode } from '@shared/constants'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList } from 'lucide-react'
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
      className="flex flex-col gap-4 rounded-xl border bg-white p-6 shadow-sm"
    >
      <div>
        <h2 id="history-title" className="font-display text-2xl font-normal text-ink">
          {t('progress.history.title')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('progress.history.subtitle')}</p>
      </div>
      {history.isLoading ? (
        <Skeleton className="h-48 w-full" />
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
          className="overflow-x-auto rounded-lg border focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
        >
          <table className="w-full min-w-[32rem] text-sm">
            <thead className="bg-sand text-start text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">
                  {t('progress.history.assessment')}
                </th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">
                  {t('progress.history.attempt')}
                </th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">
                  {t('progress.history.score')}
                </th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">
                  {t('progress.history.version')}
                </th>
                <th scope="col" className="px-4 py-2.5 text-start font-medium">
                  {t('progress.history.date')}
                </th>
              </tr>
            </thead>
            <tbody>
              {history.data.items.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-4 py-3 font-medium text-ink">{tr(row.title, i18n.language)}</td>
                  <td className="px-4 py-3 tabular-nums">{row.attemptNo}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {row.status === 'submitted' ? (
                      `${row.score}%`
                    ) : (
                      <span className="text-maroon">{t('progress.history.inProgress')}</span>
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
