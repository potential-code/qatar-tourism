import type { ProgrammeCode } from '@shared/constants'
import { useQuery } from '@tanstack/react-query'
import { ClipboardCheck, Lock } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '@/features/learning/components/LoadError'
import { WithProgramme } from '@/features/learning/components/WithProgramme'
import { ApiError } from '@/lib/api-error'
import {
  type AssessmentKind,
  assessmentStateQuery,
  useStartAssessment,
} from '../queries/assessments.queries'
import type { AssessmentResult } from '../types'
import { AssessmentResultView } from './AssessmentResultView'
import { AssessmentRunner } from './AssessmentRunner'

export function AssessmentPage({ kind }: { kind: AssessmentKind }) {
  return (
    <WithProgramme skeleton={<Skeleton className="h-96 w-full rounded-xl" />}>
      {(ctx) => <Assessment programme={ctx.programme} kind={kind} />}
    </WithProgramme>
  )
}

function Assessment({ programme, kind }: { programme: ProgrammeCode; kind: AssessmentKind }) {
  const state = useQuery(assessmentStateQuery(programme, kind))
  const start = useStartAssessment(programme, kind)
  const [fresh, setFresh] = useState<AssessmentResult | null>(null)
  const [retrying, setRetrying] = useState(false)

  if (state.isLoading)
    return <Skeleton className="h-96 w-full rounded-xl" aria-label="Loading assessment" />
  if (state.error || !state.data) {
    return (
      <LoadError
        error={state.error}
        onRetry={() => void state.refetch()}
        title="This assessment could not be opened"
      />
    )
  }
  const data = state.data
  const begin = () =>
    start.mutate(undefined, {
      onSuccess: () => {
        setFresh(null)
        setRetrying(false)
      },
      onError: (e) =>
        toast.error(e instanceof ApiError ? e.message : 'Could not start. Try again.'),
    })

  const crumbs = (
    <Breadcrumbs
      items={[{ label: 'Assessments', to: '/learner/assessments' }, { label: data.title }]}
    />
  )
  const header = (
    <div className="flex flex-col gap-2">
      <h1 className="font-display text-3xl leading-tight font-light text-ink md:text-4xl">
        {data.title}
      </h1>
      <p className="max-w-[70ch] text-muted-foreground">{data.intro}</p>
    </div>
  )

  if (data.attempt) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        {crumbs}
        {header}
        <AssessmentRunner
          attempt={data.attempt}
          programme={programme}
          kind={kind}
          title={`${data.title}, version ${data.version}`}
          onSubmitted={(result) => setFresh(result)}
        />
      </div>
    )
  }

  const result = fresh ?? data.lastResult
  if (result && !retrying) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        {crumbs}
        <AssessmentResultView
          result={result}
          programme={programme}
          canRetry={data.availability.canStart}
          onRetry={begin}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      {crumbs}
      {header}
      <div className="grid gap-6 rounded-xl border bg-white p-6 shadow-sm md:grid-cols-[1fr_auto] md:items-center md:p-8">
        <dl className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Questions</dt>
            <dd className="font-display text-3xl text-ink">5</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Pass mark</dt>
            <dd className="font-display text-3xl text-ink">
              {data.passMark ? `${data.passMark}%` : 'None'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Version</dt>
            <dd className="font-display text-3xl text-ink">{data.version}</dd>
          </div>
        </dl>
        {data.availability.canStart ? (
          <Button size="lg" onClick={begin} disabled={start.isPending}>
            <ClipboardCheck aria-hidden /> {kind === 'pre' ? 'Start pre-assessment' : 'Start'}
          </Button>
        ) : (
          <p className="flex max-w-xs items-start gap-2 text-sm text-muted-foreground">
            <Lock aria-hidden className="mt-0.5 size-4 shrink-0" /> {data.availability.reason}
          </p>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Each item is worth 20 points. Answer order is shuffled. Your answers save as you go, so you
        can leave and come back.
      </p>
    </div>
  )
}
