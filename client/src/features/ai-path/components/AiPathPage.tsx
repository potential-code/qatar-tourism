import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ClipboardCheck, Wand2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('learner')
  return (
    <div
      className="flex flex-col gap-6"
      role="status"
      aria-busy="true"
      aria-label={t('aiPath.loading')}
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
  const { t } = useTranslation('learner')
  const rec = useQuery(recommendationQuery(ctx.programme))
  const [phase, setPhase] = useState<'idle' | 'generating' | 'done'>('idle')
  const shown = phase === 'done' || (phase === 'idle' && rec.data?.accepted)

  return (
    <div className="flex flex-col gap-8">
      <Breadcrumbs
        items={[
          { label: t('aiPath.myLearning'), to: '/learner/learning' },
          { label: t('aiPath.breadcrumb') },
        ]}
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
              label={t('aiPath.demoMode')}
              className="border-white/30 bg-white/15 text-white"
            />
          </div>
          <div className="flex max-w-2xl flex-col gap-2">
            <h1 className="font-display text-3xl leading-tight font-light text-white md:text-5xl">
              {t('aiPath.title')}
            </h1>
            <p className="text-white/85">{t('aiPath.subtitle')}</p>
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
            title={t('aiPath.startBaseline')}
            description={t('aiPath.startBaselineDesc')}
            action={
              <Button asChild>
                <Link
                  to="/learner/assessments/$kind"
                  params={{ kind: 'pre' }}
                  search={{ programme: ctx.programme }}
                >
                  {t('aiPath.startPre')}
                </Link>
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <InputsPanel data={rec.data} />
          {phase === 'generating' ? (
            <GeneratingSteps programme={ctx.programme} onDone={() => setPhase('done')} />
          ) : shown ? (
            <RecommendationResult data={rec.data} />
          ) : (
            <div className="flex flex-col items-start gap-4 rounded-xl border border-dashed border-teal/40 bg-teal-mist/40 p-6 md:flex-row md:items-center md:justify-between">
              <p className="max-w-xl text-ink">{t('aiPath.ready')}</p>
              <Button size="lg" onClick={() => setPhase('generating')}>
                <Wand2 aria-hidden /> {t('aiPath.build')}
              </Button>
            </div>
          )}
          {shown && rec.data.accepted ? (
            <Button variant="ghost" className="self-start" onClick={() => setPhase('generating')}>
              <Wand2 aria-hidden /> {t('aiPath.again')}
            </Button>
          ) : null}
        </>
      )}
    </div>
  )
}
