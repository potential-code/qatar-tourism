import type { ProgrammeCode } from '@shared/constants'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Save } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { kindLabel } from '../utils/format'
import { AssessmentResultView } from './AssessmentResultView'
import { AssessmentRunner } from './AssessmentRunner'
import { StartPanel } from './StartPanel'

export function AssessmentPage({ kind }: { kind: AssessmentKind }) {
  return (
    <WithProgramme skeleton={<Skeleton className="h-96 w-full rounded-xl" />}>
      {(ctx) => <Assessment programme={ctx.programme} kind={kind} />}
    </WithProgramme>
  )
}

function Assessment({ programme, kind }: { programme: ProgrammeCode; kind: AssessmentKind }) {
  const { t, i18n } = useTranslation('assessments')
  const state = useQuery(assessmentStateQuery(programme, kind))
  const start = useStartAssessment(programme, kind)
  const [fresh, setFresh] = useState<AssessmentResult | null>(null)
  const [retrying, setRetrying] = useState(false)

  if (state.isLoading)
    return <Skeleton className="h-96 w-full rounded-xl" aria-label={t('page.loading')} />
  if (state.error || !state.data) {
    return (
      <LoadError
        error={state.error}
        onRetry={() => void state.refetch()}
        title={t('page.loadError')}
      />
    )
  }
  const data = state.data
  const title = kindLabel(t, kind, programme)
  const begin = () =>
    start.mutate(i18n.language, {
      onSuccess: () => {
        setFresh(null)
        setRetrying(false)
      },
      onError: (e) => toast.error(e instanceof ApiError ? e.message : t('page.startFailed')),
    })

  const crumbs = (
    <Breadcrumbs
      items={[{ label: t('page.crumb'), to: '/learner/assessments' }, { label: title }]}
    />
  )

  if (data.attempt) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        {crumbs}
        <h1 className="font-display text-3xl leading-tight font-light text-ink md:text-4xl">
          {title}
        </h1>
        <AssessmentRunner
          key={data.attempt.id}
          attempt={data.attempt}
          availability={data.availability}
          programme={programme}
          kind={kind}
          title={t('runner.title', { title, version: data.version })}
          exitAction={
            <Button asChild variant="ghost">
              <Link to="/learner/assessments" search={{ programme }}>
                <Save aria-hidden /> {t('runner.saveExit')}
              </Link>
            </Button>
          }
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
          canRetry={result.canRetry}
          onRetry={begin}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      {crumbs}
      <StartPanel
        data={data}
        programme={programme}
        title={title}
        pending={start.isPending}
        onStart={begin}
      />
    </div>
  )
}
