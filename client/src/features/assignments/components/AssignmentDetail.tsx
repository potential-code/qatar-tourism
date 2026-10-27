import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { FileQuestion } from 'lucide-react'
import { DemoBadge } from '@/components/layout/DemoBadge'
import { PageHeader } from '@/components/layout/PageHeader'
import { Reveal } from '@/components/motion/Reveal'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '@/features/roleplay/components/LoadError'
import { myAssignmentsQuery } from '../queries/assignments.queries'
import { ASSIGNMENT_STATE, type AssignmentState } from '../utils/status'
import { BriefCard } from './BriefCard'
import { FeedbackPanel } from './FeedbackPanel'
import { LatestSubmission } from './LatestSubmission'
import { MarkingCriteria } from './MarkingCriteria'
import { StateBanner } from './StateBanner'
import { StatusPill } from './StatusPill'
import { SubmissionComposer } from './SubmissionComposer'
import { VersionHistory } from './VersionHistory'

/** One assignment: brief, feedback, revision and full version history. */
export function AssignmentDetail({ code }: { code: string }) {
  const { data, isPending, isError, refetch } = useQuery(myAssignmentsQuery())

  if (isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-20 w-96 max-w-full" />
        <Skeleton className="h-16 rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    )
  }
  if (isError) return <LoadError what="This assignment" onRetry={() => refetch()} />

  const item = data.items.find((i) => i.assignment.code === code)
  if (!item) {
    return (
      <EmptyState
        className="rounded-xl border bg-card"
        icon={FileQuestion}
        title="Assignment not found"
        description="This assignment is not part of your programmes."
        action={
          <Button asChild>
            <Link to="/learner/assignments">Back to assignments</Link>
          </Button>
        }
      />
    )
  }

  const state = ASSIGNMENT_STATE[item.state as AssignmentState]
  const latest = item.versions[0]
  const reviewed = item.versions.find((v) => v.review)
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Assignments', to: '/learner/assignments' },
          { label: item.assignment.title },
        ]}
        title={item.assignment.title}
        description={`Program ${item.enrolment.programmeCode}: ${item.enrolment.programmeTitle}`}
        actions={<StatusPill label={state.label} tone={state.tone} />}
      />
      <StateBanner item={item} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          {reviewed?.review && item.state !== 'awaiting_review' ? (
            <FeedbackPanel
              version={reviewed}
              review={reviewed.review}
              rubric={item.assignment.rubric}
              passPercent={item.assignment.passPercent}
            />
          ) : null}
          {item.state === 'awaiting_review' && latest ? (
            <LatestSubmission version={latest} />
          ) : null}
          <BriefCard item={item} />
          {item.canSubmit ? <SubmissionComposer item={item} limits={data.limits} /> : null}
        </div>

        <Reveal className="flex flex-col gap-6">
          <section
            aria-labelledby="history-heading"
            className="grid gap-4 rounded-xl border bg-card p-5 shadow-xs"
          >
            <h2 id="history-heading" className="font-display text-xl font-light text-ink">
              Version history
            </h2>
            {item.versions.length > 0 ? (
              <VersionHistory versions={item.versions} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Each version you submit is kept here with its feedback.
              </p>
            )}
          </section>
          <MarkingCriteria rubric={item.assignment.rubric} />
          <DemoBadge />
        </Reveal>
      </div>
    </div>
  )
}
