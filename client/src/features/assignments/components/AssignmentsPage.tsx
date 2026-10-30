import { type ProgrammeCode, THRESHOLDS, UPLOAD_LIMITS } from '@shared/constants'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DemoBadge } from '@/components/layout/DemoBadge'
import { PageHeader } from '@/components/layout/PageHeader'
import { Reveal, Stagger, StaggerItem } from '@/components/motion/Reveal'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '@/features/roleplay/components/LoadError'
import { myAssignmentsQuery } from '../queries/assignments.queries'
import { AssignmentCard } from './AssignmentCard'

const MB = 1024 * 1024

/**
 * Learner Assignments: every assignment across the learner's programmes. A `programme` (from a
 * path item link) narrows the list, with a way back to all of them.
 */
export function AssignmentsPage({ programme }: { programme?: ProgrammeCode }) {
  const { t } = useTranslation('learner')
  const { data, isPending, isError, refetch } = useQuery(myAssignmentsQuery())
  const all = data?.items ?? []
  const items = programme ? all.filter((i) => i.enrolment.programmeCode === programme) : all
  const filtered = Boolean(programme) && items.length > 0 && items.length < all.length
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        image="assignments"
        title={t('assignments.page.title')}
        description={t('assignments.page.description')}
        actions={<DemoBadge compact />}
      />
      {isPending ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : isError ? (
        <LoadError what={t('assignments.page.loadWhat')} onRetry={() => refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          className="rounded-xl border bg-card"
          icon={FileText}
          title={t('assignments.page.emptyTitle')}
          description={t('assignments.page.emptyDescription')}
        />
      ) : (
        <Stagger className="grid gap-5 lg:grid-cols-2">
          {filtered ? (
            <p className="text-muted-foreground text-sm lg:col-span-2">
              {t('assignments.page.filtered', { code: programme })}{' '}
              <Link to="/learner/assignments" className="font-medium text-teal underline">
                {t('assignments.page.showAll')}
              </Link>
            </p>
          ) : null}
          {(filtered ? items : all).map((item) => (
            <StaggerItem key={item.assignment.id} className="h-full">
              <AssignmentCard item={item} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
      <Reveal className="grid gap-4 rounded-xl border bg-card p-6 shadow-xs sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
        <div className="grid gap-1">
          <h2 className="font-medium text-ink">{t('assignments.page.passMarkTitle')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('assignments.page.passMarkBody', { score: THRESHOLDS.assignmentPass })}
          </p>
        </div>
        <div className="grid gap-1">
          <h2 className="font-medium text-ink">{t('assignments.page.revisionsTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('assignments.page.revisionsBody')}</p>
        </div>
        <div className="grid gap-1">
          <h2 className="font-medium text-ink">{t('assignments.page.uploadsTitle')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('assignments.page.uploadsBody', {
              doc: UPLOAD_LIMITS.document.maxBytes / MB,
              video: UPLOAD_LIMITS.video.maxBytes / MB,
            })}
          </p>
        </div>
      </Reveal>
    </div>
  )
}
