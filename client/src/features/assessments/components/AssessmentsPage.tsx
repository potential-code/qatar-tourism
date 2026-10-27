import type { ProgrammeCode } from '@shared/constants'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight, CheckCircle2, ClipboardList, Lock, PlayCircle } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { PhotoPanel } from '@/components/brand/PhotoPanel'
import { Stagger, StaggerItem } from '@/components/motion/Reveal'
import { cardHover } from '@/components/motion/variants'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadError } from '@/features/learning/components/LoadError'
import { ProgrammeSwitcher } from '@/features/learning/components/ProgrammeSwitcher'
import { type ProgrammeContext, WithProgramme } from '@/features/learning/components/WithProgramme'
import { PAGE_IMAGE } from '@/features/learning/utils/imagery'
import { cn } from '@/lib/utils'
import { assessmentsOverviewQuery } from '../queries/assessments.queries'
import type { AssessmentsOverview } from '../types'

export function AssessmentsPage() {
  return (
    <WithProgramme skeleton={<ListSkeleton />}>{(ctx) => <Assessments ctx={ctx} />}</WithProgramme>
  )
}

function ListSkeleton() {
  return (
    <div
      className="flex flex-col gap-6"
      role="status"
      aria-busy="true"
      aria-label="Loading assessments"
    >
      <Skeleton className="h-52 w-full rounded-xl" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    </div>
  )
}

function Assessments({ ctx }: { ctx: ProgrammeContext }) {
  const overview = useQuery(assessmentsOverviewQuery(ctx.programme))
  return (
    <div className="flex flex-col gap-8">
      <PhotoPanel
        src={PAGE_IMAGE.assessments.src}
        alt={PAGE_IMAGE.assessments.alt}
        fade="start"
        className="rounded-xl"
      >
        <div className="flex min-h-52 flex-col justify-between gap-6 p-6 md:p-10">
          <ProgrammeSwitcher
            enrolments={ctx.enrolments}
            value={ctx.programme}
            onChange={ctx.setProgramme}
            tone="photo"
            className="self-start"
          />
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-3xl font-light text-white md:text-5xl">Assessments</h1>
            <p className="max-w-xl text-white/85">
              Five scenario questions, one per competency. Your baseline and post results measure
              improvement on the same skills.
            </p>
          </div>
        </div>
      </PhotoPanel>
      {overview.isLoading ? (
        <ListSkeleton />
      ) : overview.error || !overview.data ? (
        <LoadError error={overview.error} onRetry={() => void overview.refetch()} />
      ) : overview.data.items.length === 0 ? (
        <div className="rounded-xl border bg-white">
          <EmptyState
            icon={ClipboardList}
            title="No assessments in this programme"
            description="Program C is an illustrative sample with a single preview unit."
          />
        </div>
      ) : (
        <>
          {overview.data.comparison ? <Comparison data={overview.data} /> : null}
          <Stagger className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {overview.data.items.map((item) => (
              <StaggerItem key={item.kind} className="*:h-full">
                <AssessmentCard item={item} programme={ctx.programme} />
              </StaggerItem>
            ))}
            <StaggerItem
              className={cn(
                '*:h-full',
                overview.data.items.length === 3 && 'md:col-span-2 xl:col-span-3',
              )}
            >
              <MeasurementNote version={overview.data.version} />
            </StaggerItem>
          </Stagger>
        </>
      )}
    </div>
  )
}

function Comparison({ data }: { data: AssessmentsOverview }) {
  const c = data.comparison
  if (!c) return null
  return (
    <section
      className="grid gap-4 rounded-xl bg-teal-deep p-6 text-white shadow-md sm:grid-cols-3"
      aria-label="Baseline compared with post"
    >
      <div>
        <p className="text-sm text-white/70">Baseline</p>
        <p className="font-display text-5xl font-light">{c.baseline}%</p>
      </div>
      <div>
        <p className="text-sm text-white/70">{data.programme === 'A' ? 'Final' : 'Post'}</p>
        <p className="font-display text-5xl font-light">{c.post}%</p>
      </div>
      <div>
        <p className="text-sm text-white/70">Improvement</p>
        <p className="font-display text-5xl font-light text-teal-soft">
          {c.gainPoints >= 0 ? '+' : ''}
          {c.gainPoints}
        </p>
        <p className="text-xs text-white/70">
          percentage points, matched attempts, version {data.version}
        </p>
      </div>
    </section>
  )
}

function AssessmentCard({
  item,
  programme,
}: {
  item: AssessmentsOverview['items'][number]
  programme: ProgrammeCode
}) {
  const reduce = useReducedMotion()
  const status = item.inProgress
    ? { icon: PlayCircle, text: 'In progress, saved', tone: 'text-maroon' }
    : item.locked
      ? { icon: Lock, text: 'Locked', tone: 'text-muted-foreground' }
      : item.attempts > 0
        ? {
            icon: CheckCircle2,
            text: `Best ${item.best}%, ${item.attempts} ${item.attempts === 1 ? 'attempt' : 'attempts'}`,
            tone: 'text-teal',
          }
        : { icon: PlayCircle, text: 'Ready to start', tone: 'text-ink' }
  const cta = item.inProgress
    ? 'Resume'
    : item.attempts > 0
      ? 'View result'
      : item.locked
        ? 'View details'
        : 'Start'
  return (
    <motion.div
      initial="rest"
      whileHover={reduce ? undefined : 'hover'}
      variants={cardHover}
      className="rounded-xl"
    >
      <Link
        to="/learner/assessments/$kind"
        params={{ kind: item.kind }}
        search={{ programme }}
        className={cn(
          'group flex h-full flex-col gap-4 rounded-xl border bg-white p-6 focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none',
          item.locked && 'bg-white/70',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-2xl font-normal text-ink">{item.title}</h2>
          <ClipboardList aria-hidden className="size-5 text-teal/60" />
        </div>
        <p className={cn('flex items-center gap-2 text-sm font-medium', status.tone)}>
          <status.icon aria-hidden className="size-4" /> {status.text}
        </p>
        <p className="text-sm text-muted-foreground">
          {item.questions} questions
          {item.passMark ? `, pass mark ${item.passMark}%` : ', no pass mark'}
          {item.reason && (item.locked || item.attempts > 0) ? `. ${item.reason}` : '.'}
        </p>
        <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-teal">
          {cta}{' '}
          <ArrowRight
            aria-hidden
            className="size-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100"
          />
        </span>
      </Link>
    </motion.div>
  )
}

const COMPETENCY_NAMES = [
  'Discover needs',
  'Verify information',
  'Communicate clearly',
  'Recover service',
  'Protect information',
]

/** How improvement is measured (brief §8): one item per competency, matched attempts only. */
function MeasurementNote({ version }: { version: string }) {
  return (
    <section
      className="flex flex-col gap-4 rounded-xl bg-teal-mist p-6"
      aria-labelledby="measure-title"
    >
      <h2 id="measure-title" className="font-display text-2xl font-normal text-teal-deep">
        How improvement is measured
      </h2>
      <ul className="flex flex-wrap gap-2">
        {COMPETENCY_NAMES.map((name) => (
          <li
            key={name}
            className="rounded-full bg-white px-3 py-1 text-xs font-medium text-teal-deep"
          >
            {name}
          </li>
        ))}
      </ul>
      <p className="text-sm leading-relaxed text-ink/80">
        Each assessment has five equally weighted items, one per competency, worth 0 or 20 points.
        The post-assessment changes the scenario while testing the same skill. Improvement compares
        your first baseline with your latest post attempt on the same enrolment, version {version}.
      </p>
    </section>
  )
}
