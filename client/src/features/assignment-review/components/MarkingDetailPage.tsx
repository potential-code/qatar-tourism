import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ShieldAlert } from 'lucide-react'
import { DemoBadge } from '@/components/layout/DemoBadge'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusPill } from '@/features/assignments/components/StatusPill'
import { VersionHistory } from '@/features/assignments/components/VersionHistory'
import { SUBMISSION_STATUS, type SubmissionStatus } from '@/features/assignments/utils/status'
import { LoadError } from '@/features/roleplay/components/LoadError'
import { ApiError } from '@/lib/api'
import { markingDetailQuery } from '../queries/marking.queries'
import { FinalMarkCard } from './FinalMarkCard'
import { MarkingAuditTrail } from './MarkingAuditTrail'
import { MarkingForm } from './MarkingForm'
import { SubmissionContent } from './SubmissionContent'

/** Mark one submission: the work, its history and the rubric form or final mark. */
export function MarkingDetailPage({ submissionId }: { submissionId: string }) {
  const navigate = useNavigate()
  const { data, isPending, isError, error, refetch } = useQuery(markingDetailQuery(submissionId))

  if (isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-20 w-96 max-w-full" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-[560px] rounded-xl" />
        </div>
      </div>
    )
  }
  if (isError) {
    if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
      return (
        <EmptyState
          className="rounded-xl border bg-card"
          icon={ShieldAlert}
          variant="warning"
          title={
            error.status === 403
              ? 'This submission is outside your marking scope'
              : 'Submission not found'
          }
          description={
            error.status === 403
              ? 'Trainers can open only the submissions assigned to them. Ask the Academy administrator if this should be yours.'
              : 'It may have been removed by a demo reset.'
          }
          action={
            <Button asChild>
              <Link to="/trainer/assignments">Back to marking queue</Link>
            </Button>
          }
        />
      )
    }
    return <LoadError what="This submission" onRetry={() => refetch()} />
  }

  const current = data.current
  const status = current ? SUBMISSION_STATUS[current.status as SubmissionStatus] : null
  const open = current && !current.review
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Assignments', to: '/trainer/assignments' },
          { label: `${data.learner.learnerCode}, version ${current?.version ?? ''}` },
        ]}
        title={data.learner.displayName}
        description={`${data.learner.learnerCode}, Program ${data.programme.code}: ${data.assignment.title}`}
        actions={status ? <StatusPill label={status.label} tone={status.tone} /> : null}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <SubmissionContent detail={data} />
          <section
            aria-labelledby="versions-heading"
            className="grid gap-4 rounded-xl border bg-card p-5 shadow-xs"
          >
            <h2 id="versions-heading" className="font-display text-xl font-light text-ink">
              Version history
            </h2>
            <VersionHistory
              versions={data.versions}
              currentId={data.id}
              onSelect={(id) =>
                navigate({ to: '/trainer/assignments/$submissionId', params: { submissionId: id } })
              }
            />
          </section>
          <MarkingAuditTrail versions={data.versions} />
        </div>
        <div className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
          {/* Keyed so the form resets when another version opens. */}
          {open ? (
            <MarkingForm key={data.id} detail={data} />
          ) : (
            <FinalMarkCard key={data.id} detail={data} />
          )}
          <DemoBadge compact className="self-start" />
        </div>
      </div>
    </div>
  )
}
