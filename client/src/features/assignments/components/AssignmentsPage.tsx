import { type ProgrammeCode, THRESHOLDS, UPLOAD_LIMITS } from '@shared/constants'
import { useQuery } from '@tanstack/react-query'
import { FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DemoBadge } from '@/components/layout/DemoBadge'
import { PageHeader } from '@/components/layout/PageHeader'
import { Reveal, Stagger, StaggerItem } from '@/components/motion/Reveal'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useActiveProgramme } from '@/features/learning/hooks/useActiveProgramme'
import { LoadError } from '@/features/roleplay/components/LoadError'
import { cn } from '@/lib/utils'
import { myAssignmentsQuery } from '../queries/assignments.queries'
import { AssignmentCard } from './AssignmentCard'

const MB = 1024 * 1024

/**
 * Learner Assignments for the active programme (top-bar switcher, brief §5): a learner in A and B
 * sees only the programme they are looking at. A `programme` (from a path item link) wins.
 */
export function AssignmentsPage({ programme: linked }: { programme?: ProgrammeCode }) {
  const { t } = useTranslation('learner')
  const active = useActiveProgramme()
  const { data, isPending, isError, refetch } = useQuery(myAssignmentsQuery())
  const programme = linked ?? active.programme ?? undefined
  const all = data?.items ?? []
  const items = programme ? all.filter((i) => i.enrolment.programmeCode === programme) : all
  const showScope = Boolean(programme) && active.enrolments.length > 1
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        image="assignments"
        title={t('assignments.page.title')}
        description={t('assignments.page.description')}
        actions={<DemoBadge compact />}
      />
      {isPending || active.isLoading ? (
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
          {showScope ? (
            <p className="text-muted-foreground text-sm lg:col-span-2">
              {t('assignments.page.filtered', { code: programme })}
            </p>
          ) : null}
          {items.map((item) => (
            <StaggerItem key={item.assignment.id} className="h-full">
              <AssignmentCard item={item} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
      <AssignmentRules showUploads={programme === 'A'} />
    </div>
  )
}

/** Pass mark and revisions apply to every assignment; file uploads are Program A only. */
function AssignmentRules({ showUploads }: { showUploads: boolean }) {
  const { t } = useTranslation('learner')
  return (
    <Reveal
      className={cn(
        'grid gap-4 rounded-xl border bg-card p-6 shadow-xs md:grid-cols-1',
        showUploads ? 'sm:grid-cols-3 lg:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-2',
      )}
    >
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
      {showUploads ? (
        <div className="grid gap-1">
          <h2 className="font-medium text-ink">{t('assignments.page.uploadsTitle')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('assignments.page.uploadsBody', {
              doc: UPLOAD_LIMITS.document.maxBytes / MB,
              video: UPLOAD_LIMITS.video.maxBytes / MB,
            })}
          </p>
        </div>
      ) : null}
    </Reveal>
  )
}
