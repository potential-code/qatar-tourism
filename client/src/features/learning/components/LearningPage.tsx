import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { SimulatedTag } from '@/components/layout/SimulatedTag'
import { Reveal, Stagger, StaggerItem } from '@/components/motion/Reveal'
import { Button } from '@/components/ui/button'
import { journeyQuery } from '../queries/learning.queries'
import type { Journey } from '../types'
import { minutesLabel } from '../utils/format'
import { LearningSkeleton } from './LearningSkeleton'
import { LoadError } from './LoadError'
import { PathItemCard } from './PathItemCard'
import { ProgrammeSwitcher } from './ProgrammeSwitcher'
import { ResumeBanner } from './ResumeBanner'
import { StageMap } from './StageMap'
import { type ProgrammeContext, WithProgramme } from './WithProgramme'

/** My learning (brief §5 step 4, §6): the path, required vs recommended, resume. */
export function LearningPage() {
  return (
    <WithProgramme skeleton={<LearningSkeleton />}>{(ctx) => <Learning ctx={ctx} />}</WithProgramme>
  )
}

function groupByStage(items: Journey['items']) {
  const groups: { stage: string; level: number; items: Journey['items'] }[] = []
  for (const item of items) {
    const last = groups.at(-1)
    if (last && last.stage === item.stage && last.level === item.level) last.items.push(item)
    else groups.push({ stage: item.stage, level: item.level, items: [item] })
  }
  return groups
}

function Learning({ ctx }: { ctx: ProgrammeContext }) {
  const journey = useQuery(journeyQuery(ctx.programme))
  const header = (
    <PageHeader
      title="My learning"
      description={
        ctx.programme === 'B'
          ? 'One stage, Visitor Service Essentials. Your units are personalised to your profile and baseline.'
          : ctx.programme === 'A'
            ? 'Two levels with explicit stages. Each stage opens when the one before it is complete.'
            : 'An illustrative sample programme with a single preview unit.'
      }
      actions={
        <ProgrammeSwitcher
          enrolments={ctx.enrolments}
          value={ctx.programme}
          onChange={ctx.setProgramme}
        />
      }
    />
  )
  if (journey.isLoading)
    return (
      <div className="flex flex-col gap-8">
        {header}
        <LearningSkeleton />
      </div>
    )
  if (journey.error || !journey.data) {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <LoadError error={journey.error} onRetry={() => void journey.refetch()} />
      </div>
    )
  }
  const data = journey.data
  const required = data.items.filter((i) => i.required)
  const optional = data.items.filter((i) => !i.required)
  let step = 0

  return (
    <div className="flex flex-col gap-8">
      {header}
      <ResumeBanner journey={data} />
      {data.gates.length > 0 ? (
        <Reveal className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-5 font-display text-2xl font-normal text-ink">Levels and stages</h2>
          <StageMap gates={data.gates} />
        </Reveal>
      ) : null}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="required-title" className="flex flex-col gap-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="required-title" className="font-display text-2xl font-normal text-ink">
              Required
            </h2>
            <p className="text-sm text-muted-foreground">
              {required.filter((i) => i.state === 'completed').length} of {required.length}{' '}
              complete, about {minutesLabel(data.remainingMinutes)} remaining
            </p>
          </div>
          {groupByStage(required).map((group) => (
            <div key={group.items[0]?.id ?? group.stage} className="flex flex-col gap-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                {ctx.programme === 'A' && group.stage !== 'Onboarding'
                  ? `Level ${group.level}: `
                  : ''}
                {group.stage}
              </h3>
              <Stagger className="flex flex-col gap-3">
                {group.items.map((item) => {
                  step += 1
                  return (
                    <StaggerItem key={item.id}>
                      <PathItemCard item={item} programme={ctx.programme} index={step} />
                    </StaggerItem>
                  )
                })}
              </Stagger>
            </div>
          ))}
        </section>

        <aside className="flex flex-col gap-6" aria-labelledby="recommended-title">
          <div className="flex flex-col gap-3">
            <h2 id="recommended-title" className="font-display text-2xl font-normal text-ink">
              Recommended
            </h2>
            {data.extras.length + optional.length === 0 ? (
              <p className="rounded-xl border border-dashed bg-white/60 p-4 text-sm text-muted-foreground">
                No extra units. Your baseline showed no gaps outside your path.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {data.extras.map((extra) => (
                  <PathItemCard
                    key={extra.courseCode}
                    recommended
                    compact
                    programme={ctx.programme}
                    item={{
                      id: extra.courseCode,
                      kind: 'course',
                      courseCode: extra.courseCode,
                      scenarioKey: null,
                      title: extra.title,
                      state: extra.state as Journey['items'][number]['state'],
                      lockReason: null,
                      estimatedMinutes: extra.minutes,
                      unit: {
                        status: 'in_progress',
                        percent: extra.percent,
                        scoreRaw: null,
                        completedAt: null,
                      },
                    }}
                  />
                ))}
                {optional.map((item) => (
                  <PathItemCard
                    key={item.id}
                    item={item}
                    programme={ctx.programme}
                    recommended
                    compact
                  />
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3 rounded-xl bg-teal-deep p-5 text-white shadow-md">
            <div className="flex items-center gap-2">
              <Sparkles aria-hidden className="size-4 text-teal-soft" />
              <p className="text-sm font-medium">Why this path</p>
              <SimulatedTag label="Demo mode" className="border-white/20 bg-white/10 text-white" />
            </div>
            <p className="text-sm leading-relaxed text-white/85">{data.rationale}</p>
            <Button asChild variant="glass" size="sm" className="self-start">
              <Link to="/learner/learning/path" search={{ programme: ctx.programme }}>
                View recommendation details <ArrowRight aria-hidden className="rtl:-scale-x-100" />
              </Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  )
}
