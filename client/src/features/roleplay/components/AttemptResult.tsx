import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Info, Keyboard, Mic, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DemoBadge } from '@/components/layout/DemoBadge'
import { PageHeader } from '@/components/layout/PageHeader'
import { SimulatedTag } from '@/components/layout/SimulatedTag'
import { Reveal } from '@/components/motion/Reveal'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { tr } from '@/i18n/localised'
import { qatarDateTime } from '@/lib/format/qatar-time'
import { practiceAttemptQuery, practiceAttemptsQuery } from '../queries/roleplay.queries'
import { AttemptHistory } from './AttemptHistory'
import { ChatThread } from './ChatThread'
import { CriterionRow } from './CriterionRow'
import { LoadError } from './LoadError'
import { ScoreReveal } from './ScoreReveal'

/** Feedback for one attempt: animated score, rubric with evidence, transcript and history. */
export function AttemptResult({ attemptId }: { attemptId: string }) {
  const { t, i18n } = useTranslation('learner')
  const attempt = useQuery(practiceAttemptQuery(attemptId))
  const history = useQuery({
    ...practiceAttemptsQuery(attempt.data?.scenarioKey),
    enabled: Boolean(attempt.data),
  })

  if (attempt.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-16 w-80" />
        <Skeleton className="h-64 rounded-[1.25rem]" />
        <div className="grid gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }
  if (attempt.isError)
    return <LoadError what={t('roleplay.result.loadWhat')} onRetry={() => attempt.refetch()} />

  const a = attempt.data
  const ModeIcon = a.mode === 'voice' ? Mic : Keyboard
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        breadcrumbs={[
          { label: t('roleplay.overview.crumb'), to: '/learner/practice' },
          { label: tr(a.scenarioTitle, i18n.language) },
        ]}
        title={t('roleplay.result.title', { scenario: tr(a.scenarioTitle, i18n.language) })}
        description={
          <>
            <ModeIcon aria-hidden className="me-1.5 inline size-4 align-[-2px]" />
            {t('roleplay.result.practiceLine', {
              mode: a.mode === 'voice' ? t('roleplay.modes.voice') : t('roleplay.modes.text'),
              code: a.programmeCode,
              date: qatarDateTime(a.completedAt),
            })}
          </>
        }
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/learner/practice">
                <ArrowLeft aria-hidden className="rtl:-scale-x-100" />{' '}
                {t('roleplay.result.allScenarios')}
              </Link>
            </Button>
            <Button asChild>
              <Link to="/learner/practice/$scenarioKey" params={{ scenarioKey: a.scenarioKey }}>
                <RotateCcw aria-hidden /> {t('roleplay.result.tryAgain')}
              </Link>
            </Button>
          </>
        }
      />

      <section className="rounded-[1.5rem] bg-white/60 p-1.5 shadow-sm ring-1 ring-ink/5">
        <div className="flex flex-col gap-6 rounded-[calc(1.5rem-0.375rem)] border border-border/60 bg-card p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <SimulatedTag label={tr(a.label, i18n.language)} />
            {a.usedRecordedDemo ? <SimulatedTag label={t('roleplay.result.usedDemo')} /> : null}
          </div>
          <ScoreReveal attempt={a} />
        </div>
      </section>

      <section aria-labelledby="rubric-heading" className="flex flex-col gap-4">
        <div className="grid gap-1">
          <h2 id="rubric-heading" className="font-display text-2xl font-light text-ink">
            {t('roleplay.result.rubricTitle')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('roleplay.result.rubricBody')}</p>
        </div>
        <ol className="grid gap-3">
          {a.criteria.map((criterion, index) => (
            <CriterionRow key={criterion.key} criterion={criterion} index={index} />
          ))}
        </ol>
      </section>

      <Reveal className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section
          aria-labelledby="transcript-heading"
          className="flex flex-col overflow-hidden rounded-xl border bg-sand"
        >
          <h2
            id="transcript-heading"
            className="border-b bg-white px-5 py-3 font-display text-xl font-light text-ink"
          >
            {t('roleplay.result.transcriptTitle')}
          </h2>
          <div className="flex max-h-[560px] flex-col">
            <ChatThread
              transcript={a.transcript}
              label={t('roleplay.result.transcriptLabel')}
              follow={false}
            />
          </div>
        </section>
        <section
          aria-labelledby="scenario-history"
          className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-xs"
        >
          <h2 id="scenario-history" className="font-display text-xl font-light text-ink">
            {t('roleplay.result.historyTitle')}
          </h2>
          {history.isPending ? (
            <Skeleton className="h-28 rounded-lg" />
          ) : history.isError ? (
            <LoadError
              what={t('roleplay.result.historyLoadWhat')}
              onRetry={() => history.refetch()}
            />
          ) : (
            <AttemptHistory
              attempts={history.data.items}
              bestId={history.data.summary.best?.id}
              latestId={history.data.summary.latest?.id}
              currentId={a.id}
              showScenario={false}
            />
          )}
          <p className="mt-auto flex gap-2 rounded-lg bg-teal-mist/60 p-3 text-xs leading-relaxed text-teal-deep">
            <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            {t('roleplay.result.formative')}
          </p>
          <DemoBadge compact className="self-start" />
        </section>
      </Reveal>
    </div>
  )
}
