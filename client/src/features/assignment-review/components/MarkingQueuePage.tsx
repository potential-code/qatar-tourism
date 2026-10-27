import { THRESHOLDS } from '@shared/constants'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, ClipboardCheck, CornerUpLeft, Inbox } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { StatCard } from '@/components/data/StatCard'
import { DemoBadge } from '@/components/layout/DemoBadge'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '@/features/roleplay/components/LoadError'
import { markingQueueQuery } from '../queries/marking.queries'
import { QueueFilters, type QueueStatus } from './QueueFilters'
import { QueueList } from './QueueList'

const PAGE_SIZE = 25

const EMPTY: Record<QueueStatus, { title: string; description: string }> = {
  open: {
    title: 'Nothing waiting to be marked',
    description: 'New submissions from your learners appear here, oldest first.',
  },
  returned: {
    title: 'No returned submissions',
    description: 'Work you return for revision appears here until the learner resubmits.',
  },
  approved: { title: 'No approved submissions yet', description: 'Approved work is listed here.' },
  all: {
    title: 'No submissions assigned to you',
    description: 'Submissions assigned to you will appear here.',
  },
}

/** Trainer marking queue (brief §10): only submissions within this trainer's scope. */
export function MarkingQueuePage() {
  const [status, setStatus] = useState<QueueStatus>('open')
  const [programme, setProgramme] = useState<'all' | 'A' | 'B'>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const deferredSearch = useDeferredValue(search.trim())

  const query = useQuery(
    markingQueueQuery({
      status,
      programme: programme === 'all' ? undefined : programme,
      search: deferredSearch || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
  )
  const counts = query.data?.counts
  const pages = query.data ? Math.max(1, Math.ceil(query.data.total / PAGE_SIZE)) : 1

  const pick = (next: QueueStatus) => {
    setStatus(next)
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        image="marking"
        title="Assignments"
        description={`Mark the submissions assigned to you with the rubric. The pass mark is ${THRESHOLDS.assignmentPass}. Learners see only your final marks, never drafts.`}
        actions={<DemoBadge compact />}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="To mark"
          value={counts?.open ?? 0}
          icon={Inbox}
          isLoading={query.isPending}
          onClick={() => pick('open')}
        />
        <StatCard
          label="Overdue"
          value={counts?.overdue ?? 0}
          icon={AlertTriangle}
          tone="maroon"
          isLoading={query.isPending}
          description={`Waiting ${THRESHOLDS.markingOverdueDays} days or more`}
          onClick={() => pick('open')}
        />
        <StatCard
          label="Returned for revision"
          value={counts?.returned ?? 0}
          icon={CornerUpLeft}
          tone="neutral"
          isLoading={query.isPending}
          onClick={() => pick('returned')}
        />
        <StatCard
          label="Approved"
          value={counts?.approved ?? 0}
          icon={CheckCircle2}
          tone="neutral"
          isLoading={query.isPending}
          onClick={() => pick('approved')}
        />
      </div>

      <section aria-labelledby="queue-heading" className="flex flex-col gap-4">
        <h2 id="queue-heading" className="sr-only">
          Marking queue
        </h2>
        <QueueFilters
          status={status}
          counts={counts}
          programme={programme}
          search={search}
          onStatus={pick}
          onProgramme={(value) => {
            setProgramme(value)
            setPage(1)
          }}
          onSearch={(value) => {
            setSearch(value)
            setPage(1)
          }}
        />

        {query.isPending ? (
          <div className="grid gap-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : query.isError ? (
          <LoadError what="The marking queue" onRetry={() => query.refetch()} />
        ) : query.data.items.length === 0 ? (
          <EmptyState
            className="rounded-xl border bg-card"
            icon={deferredSearch ? ClipboardCheck : Inbox}
            title={deferredSearch ? 'No matching learners' : EMPTY[status].title}
            description={
              deferredSearch
                ? `No submission matches "${deferredSearch}". Search by learner ID, such as L0004, or by name.`
                : EMPTY[status].description
            }
            action={
              deferredSearch ? (
                <Button variant="outline" onClick={() => setSearch('')}>
                  Clear search
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <QueueList
              items={query.data.items}
              scoreColumn={status === 'returned' || status === 'approved'}
            />
            <nav
              aria-label="Pages"
              className="flex flex-wrap items-center justify-between gap-3 text-sm"
            >
              <span className="text-muted-foreground">
                {query.data.total} {query.data.total === 1 ? 'submission' : 'submissions'}, page{' '}
                {page} of {pages}
              </span>
              <span className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </span>
            </nav>
          </>
        )}
      </section>
    </div>
  )
}
