import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ClipboardCheck, Wand2 } from 'lucide-react'
import { useState } from 'react'
import { PhotoPanel } from '@/components/brand/PhotoPanel'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { SimulatedTag } from '@/components/layout/SimulatedTag'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '@/features/learning/components/LoadError'
import { ProgrammeSwitcher } from '@/features/learning/components/ProgrammeSwitcher'
import { type ProgrammeContext, WithProgramme } from '@/features/learning/components/WithProgramme'
import { PAGE_IMAGE } from '@/features/learning/utils/imagery'
import { recommendationQuery } from '../queries/ai-path.queries'
import { GeneratingSteps } from './GeneratingSteps'
import { InputsPanel } from './InputsPanel'
import { RecommendationResult } from './RecommendationResult'

/** AI path generator (brief §5 step 3, §9), scripted and labelled Demo mode. */
export function AiPathPage() {
  return <WithProgramme skeleton={<PathSkeleton />}>{(ctx) => <AiPath ctx={ctx} />}</WithProgramme>
}

function PathSkeleton() {
  return (
    <div
      className="flex flex-col gap-6"
      role="status"
      aria-busy="true"
      aria-label="Loading recommendation"
    >
      <Skeleton className="h-56 w-full rounded-xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  )
}

function AiPath({ ctx }: { ctx: ProgrammeContext }) {
  const rec = useQuery(recommendationQuery(ctx.programme))
  const [phase, setPhase] = useState<'idle' | 'generating' | 'done'>('idle')
  const shown = phase === 'done' || (phase === 'idle' && rec.data?.accepted)

  return (
    <div className="flex flex-col gap-8">
      <Breadcrumbs
        items={[{ label: 'My learning', to: '/learner/learning' }, { label: 'Learning path' }]}
      />
      <PhotoPanel
        src={PAGE_IMAGE.aiPath.src}
        alt={PAGE_IMAGE.aiPath.alt}
        fade="start"
        className="rounded-xl"
      >
        <div className="flex min-h-56 flex-col justify-between gap-6 p-6 md:p-10">
          <div className="flex flex-wrap items-center gap-3">
            <ProgrammeSwitcher
              enrolments={ctx.enrolments}
              value={ctx.programme}
              onChange={ctx.setProgramme}
              tone="photo"
            />
            <SimulatedTag
              label="Demo mode: scripted recommendation"
              className="border-white/30 bg-white/15 text-white"
            />
          </div>
          <div className="flex max-w-2xl flex-col gap-2">
            <h1 className="font-display text-3xl leading-tight font-light text-white md:text-5xl">
              Your personalised learning path
            </h1>
            <p className="text-white/85">
              Built from your profile and baseline, using only administrator-approved courses and
              paths.
            </p>
          </div>
        </div>
      </PhotoPanel>

      {rec.isLoading ? (
        <PathSkeleton />
      ) : rec.error || !rec.data ? (
        <LoadError error={rec.error} onRetry={() => void rec.refetch()} />
      ) : !rec.data.inputs.baseline ? (
        <div className="rounded-xl border bg-white">
          <EmptyState
            icon={ClipboardCheck}
            size="lg"
            title="Start with your baseline"
            description="Five scenario questions show where to begin. The baseline identifies useful learning and is not an entry barrier."
            action={
              <Button asChild>
                <Link
                  to="/learner/assessments/$kind"
                  params={{ kind: 'pre' }}
                  search={{ programme: ctx.programme }}
                >
                  Start pre-assessment
                </Link>
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <InputsPanel data={rec.data} />
          {phase === 'generating' ? (
            <GeneratingSteps onDone={() => setPhase('done')} />
          ) : shown ? (
            <RecommendationResult data={rec.data} />
          ) : (
            <div className="flex flex-col items-start gap-4 rounded-xl border border-dashed border-teal/40 bg-teal-mist/40 p-6 md:flex-row md:items-center md:justify-between">
              <p className="max-w-xl text-ink">
                Your inputs are ready. The generator matches them against the published path rules
                and your lowest baseline areas.
              </p>
              <Button size="lg" onClick={() => setPhase('generating')}>
                <Wand2 aria-hidden /> Build my learning path
              </Button>
            </div>
          )}
          {shown && rec.data.accepted ? (
            <Button variant="ghost" className="self-start" onClick={() => setPhase('generating')}>
              <Wand2 aria-hidden /> Generate again
            </Button>
          ) : null}
        </>
      )}
    </div>
  )
}
