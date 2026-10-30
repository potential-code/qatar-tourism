import type { ProgrammeCode } from '@shared/constants'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight, CheckCircle2, ClipboardList, Lock, PlayCircle } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
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
import { kindLabel } from '../utils/format'
import { ImprovementBanner } from './ImprovementBanner'

export function AssessmentsPage() {
  return (
    <WithProgramme skeleton={<ListSkeleton />}>{(ctx) => <Assessments ctx={ctx} />}</WithProgramme>
  )
}

function ListSkeleton() {
  const { t } = useTranslation('assessments')
  return (
    <div
      className="flex flex-col gap-6"
      role="status"
      aria-busy="true"
      aria-label={t('page.loading')}
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
  const { t } = useTranslation('assessments')
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
            <h1 className="font-display text-3xl font-light text-white md:text-5xl">
              {t('page.title')}
            </h1>
            <p className="max-w-xl text-white/85">{t('page.lead')}</p>
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
            title={t('page.emptyTitle')}
            description={t('page.emptyBody')}
          />
        </div>
      ) : (
        <>
          {overview.data.comparison ? (
            <ImprovementBanner
              comparison={overview.data.comparison}
              programme={ctx.programme}
              policy="best"
            />
          ) : null}
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
              <MeasurementNote />
            </StaggerItem>
          </Stagger>
        </>
      )}
    </div>
  )
}

function AssessmentCard({
  item,
  programme,
}: {
  item: AssessmentsOverview['items'][number]
  programme: ProgrammeCode
}) {
  const { t } = useTranslation('assessments')
  const reduce = useReducedMotion()
  const status = item.inProgress
    ? { icon: PlayCircle, text: t('card.inProgress'), tone: 'text-maroon' }
    : item.locked
      ? { icon: Lock, text: t('card.locked'), tone: 'text-muted-foreground' }
      : item.attempts > 0
        ? {
            icon: CheckCircle2,
            text: t('card.counted', { score: item.best ?? 0 }),
            tone: 'text-teal',
          }
        : { icon: PlayCircle, text: t('card.ready'), tone: 'text-ink' }
  const cta = item.inProgress
    ? t('card.resume')
    : item.attempts > 0
      ? t('card.viewResult')
      : item.locked
        ? t('card.viewDetails')
        : t('card.start')
  const reason =
    item.reasonCode === null
      ? null
      : item.reasonCode === 'locked'
        ? item.reason
        : t(`reason.${item.reasonCode}`)
  const allowed = (item.attemptLimit ?? 0) + item.extraGranted
  const facts = [
    t('card.questions', { n: item.questions }),
    item.passMark !== null ? t('card.passRequirement', { n: item.passMark }) : t('card.noPass'),
    item.attemptLimit !== null
      ? t('card.attempts', { left: item.attemptsRemaining ?? 0, total: allowed })
      : null,
    item.timeLimitMinutes !== null ? t('card.timeLimit', { n: item.timeLimitMinutes }) : null,
  ].filter((fact): fact is string => fact !== null)
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
          <h2 className="font-display text-2xl font-normal text-ink">
            {kindLabel(t, item.kind, programme)}
          </h2>
          <ClipboardList aria-hidden className="size-5 text-teal/60" />
        </div>
        <p className={cn('flex items-center gap-2 text-sm font-medium', status.tone)}>
          <status.icon aria-hidden className="size-4" /> {status.text}
        </p>
        <ul className="flex flex-col gap-0.5 text-sm text-muted-foreground">
          {facts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
        {reason && (item.locked || item.attempts > 0) ? (
          <p className="text-sm text-ink/80">{reason}</p>
        ) : null}
        <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-teal">
          {cta}{' '}
          <ArrowRight
            aria-hidden
            className="size-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1"
          />
        </span>
      </Link>
    </motion.div>
  )
}

/** How improvement is measured (brief §8): the same five competencies, matched attempts only. */
function MeasurementNote() {
  const { t } = useTranslation('assessments')
  const names = [
    'discover_needs',
    'verify_information',
    'communicate_clearly',
    'recover_service',
    'protect_information',
  ] as const
  return (
    <section
      className="flex flex-col gap-4 rounded-xl bg-teal-mist p-6"
      aria-labelledby="measure-title"
    >
      <h2 id="measure-title" className="font-display text-2xl font-normal text-teal-deep">
        {t('measure.title')}
      </h2>
      <ul className="flex flex-wrap gap-2">
        {names.map((name) => (
          <li
            key={name}
            className="rounded-full bg-white px-3 py-1 text-xs font-medium text-teal-deep"
          >
            {t(`competency.${name}`)}
          </li>
        ))}
      </ul>
      <p className="text-sm leading-relaxed text-ink/80">{t('measure.body')}</p>
    </section>
  )
}
