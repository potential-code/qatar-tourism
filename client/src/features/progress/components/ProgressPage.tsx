import { useQuery } from '@tanstack/react-query'
import { CalendarCheck, Gauge, MessagesSquare, TrendingUp } from 'lucide-react'
import { StatCard } from '@/components/data/StatCard'
import { PageHeader } from '@/components/layout/PageHeader'
import { Reveal } from '@/components/motion/Reveal'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '@/features/learning/components/LoadError'
import { ProgrammeSwitcher } from '@/features/learning/components/ProgrammeSwitcher'
import { StageMap } from '@/features/learning/components/StageMap'
import { type ProgrammeContext, WithProgramme } from '@/features/learning/components/WithProgramme'
import { journeyQuery } from '@/features/learning/queries/learning.queries'
import { minutesLabel } from '@/features/learning/utils/format'
import { AttemptHistory } from './AttemptHistory'
import { CompetencyChart } from './CompetencyChart'
import { PracticeScores } from './PracticeScores'

/** Progress (brief §5, §9): competencies, attempt history, practice tracked separately. */
export function ProgressPage() {
  return (
    <WithProgramme skeleton={<ProgressSkeleton />}>{(ctx) => <Progress ctx={ctx} />}</WithProgramme>
  )
}

function ProgressSkeleton() {
  return (
    <div
      className="flex flex-col gap-6"
      role="status"
      aria-busy="true"
      aria-label="Loading progress"
    >
      <Skeleton className="h-14 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {['s1', 's2', 's3', 's4'].map((key) => (
          <Skeleton key={key} className="h-32 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  )
}

function Progress({ ctx }: { ctx: ProgrammeContext }) {
  const journey = useQuery(journeyQuery(ctx.programme))
  const header = (
    <PageHeader
      title="Progress"
      description="Knowledge results, practice and trainer-marked work, kept separate so each tells its own story."
      actions={
        <ProgrammeSwitcher
          enrolments={ctx.enrolments}
          value={ctx.programme}
          onChange={ctx.setProgramme}
        />
      }
    />
  )
  if (journey.isLoading) return <ProgressSkeleton />
  if (journey.error || !journey.data) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <LoadError error={journey.error} onRetry={() => void journey.refetch()} />
      </div>
    )
  }
  const data = journey.data
  const { baseline, post, gainPoints } = data.assessments
  const postLabel = ctx.programme === 'A' ? 'Final' : 'Post'

  return (
    <div className="flex flex-col gap-8">
      {header}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Programme progress"
          value={data.enrolment.progressPercent}
          suffix="%"
          icon={Gauge}
          description={
            data.remainingMinutes > 0
              ? `About ${minutesLabel(data.remainingMinutes)} remaining`
              : 'Every required step complete'
          }
        />
        <StatCard
          label="Baseline"
          value={
            baseline ? baseline.score : <span className="text-2xl text-muted-foreground">None</span>
          }
          suffix={baseline ? '%' : undefined}
          icon={TrendingUp}
          tone="neutral"
        />
        <StatCard
          label={postLabel}
          value={
            post ? post.score : <span className="text-2xl text-muted-foreground">Not yet</span>
          }
          suffix={post ? '%' : undefined}
          icon={TrendingUp}
          delta={
            gainPoints !== null
              ? {
                  value: `${gainPoints >= 0 ? '+' : ''}${gainPoints} percentage points`,
                  direction: gainPoints > 0 ? 'up' : gainPoints < 0 ? 'down' : 'flat',
                }
              : undefined
          }
        />
        {ctx.programme === 'A' ? (
          <StatCard
            label="Trainer session score"
            value={
              data.session.bestFinalScore ?? (
                <span className="text-2xl text-muted-foreground">Not yet</span>
              )
            }
            suffix={data.session.bestFinalScore !== null ? '/100' : undefined}
            icon={CalendarCheck}
            tone="maroon"
            description="Pass mark 70, attended sessions only"
          />
        ) : (
          <StatCard
            label="Practice best"
            value={
              data.practice.best ?? <span className="text-2xl text-muted-foreground">None yet</span>
            }
            suffix={data.practice.best !== null ? '/100' : undefined}
            icon={MessagesSquare}
            tone="maroon"
            description="Simulated AI practice, formative only"
          />
        )}
      </div>

      {data.gates.length > 0 ? (
        <Reveal className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-5 font-display text-2xl font-normal text-ink">Levels and stages</h2>
          <StageMap gates={data.gates} />
        </Reveal>
      ) : null}

      <Reveal className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="font-display text-2xl font-normal text-ink">Competencies</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Points out of 20 per competency in each knowledge assessment.
        </p>
        <CompetencyChart
          data={data.competencies}
          postLabel={postLabel}
          showFoundation={ctx.programme === 'A'}
        />
      </Reveal>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <AttemptHistory programme={ctx.programme} />
        <PracticeScores practice={data.practice} programme={ctx.programme} />
      </div>
    </div>
  )
}
