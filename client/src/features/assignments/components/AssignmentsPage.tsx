import { type ProgrammeCode, THRESHOLDS, UPLOAD_LIMITS } from '@shared/constants'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { FileText } from 'lucide-react'
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
  const { data, isPending, isError, refetch } = useQuery(myAssignmentsQuery())
  const all = data?.items ?? []
  const items = programme ? all.filter((i) => i.enrolment.programmeCode === programme) : all
  const filtered = Boolean(programme) && items.length > 0 && items.length < all.length
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        image="assignments"
        title="Assignments"
        description="Submit your work, read your trainer's feedback and revise when asked. Every version you submit is kept."
        actions={<DemoBadge compact />}
      />
      {isPending ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : isError ? (
        <LoadError what="Your assignments" onRetry={() => refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          className="rounded-xl border bg-card"
          icon={FileText}
          title="No assignments yet"
          description="Assignments appear when you join Program A or Program B. Program C is an illustrative sample with no assignments."
        />
      ) : (
        <Stagger className="grid gap-5 lg:grid-cols-2">
          {filtered ? (
            <p className="text-muted-foreground text-sm lg:col-span-2">
              Showing Program {programme} assignments.{' '}
              <Link to="/learner/assignments" className="font-medium text-teal underline">
                Show all programmes
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
          <h2 className="font-medium text-ink">Pass mark</h2>
          <p className="text-sm text-muted-foreground">
            Assignments pass at {THRESHOLDS.assignmentPass} out of 100. This is an illustrative demo
            setting.
          </p>
        </div>
        <div className="grid gap-1">
          <h2 className="font-medium text-ink">Revisions</h2>
          <p className="text-sm text-muted-foreground">
            If your trainer returns your work, revise it and submit a new version.
          </p>
        </div>
        <div className="grid gap-1">
          <h2 className="font-medium text-ink">Uploads</h2>
          <p className="text-sm text-muted-foreground">
            Program A accepts PDF or DOCX up to {UPLOAD_LIMITS.document.maxBytes / MB} MB, or MP4 up
            to {UPLOAD_LIMITS.video.maxBytes / MB} MB.
          </p>
        </div>
      </Reveal>
    </div>
  )
}
