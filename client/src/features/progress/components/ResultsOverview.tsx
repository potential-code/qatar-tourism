import type { ProgrammeCode } from '@shared/constants'
import { CalendarCheck, Clock, MessagesSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ProgressRing } from '@/components/data/ProgressRing'
import type { Journey } from '@/features/learning/types'
import { minutesLabel } from '@/features/learning/utils/format'
import { KnowledgeTile } from './KnowledgeTile'
import { ResultValue } from './ResultValue'

/**
 * Headline results (brief §5, §9): programme progress, the knowledge pair, and practice (B) or
 * the trainer session score (A) on its own tile, so practice never reads as a knowledge score.
 */
export function ResultsOverview({
  journey,
  programme,
  postLabel,
}: {
  journey: Journey
  programme: ProgrammeCode
  postLabel: string
}) {
  const { t } = useTranslation('learner')
  const percent = journey.enrolment.progressPercent
  const required = journey.items.filter((i) => i.required)
  const done = required.filter((i) => i.state === 'completed').length
  const isA = programme === 'A'
  const side = isA
    ? {
        icon: CalendarCheck,
        label: t('progress.page.sessionScore'),
        value: journey.session.bestFinalScore,
        empty: t('progress.page.notYet'),
        note: t('progress.page.sessionNote'),
      }
    : {
        icon: MessagesSquare,
        label: t('progress.page.practiceBest'),
        value: journey.practice.best,
        empty: t('progress.page.noneYet'),
        note: t('progress.page.practiceNote'),
      }
  const SideIcon = side.icon

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12">
      <section
        aria-labelledby="programme-progress-title"
        className="qt-grain relative isolate flex flex-col gap-4 overflow-hidden rounded-xl bg-grad-teal p-5 text-white shadow-[var(--qt-shadow-md)] md:p-6 lg:col-span-3"
      >
        <h2 id="programme-progress-title" className="font-sans text-sm font-medium">
          {t('progress.page.programmeProgress')}
        </h2>
        <div className="flex items-center gap-4">
          <ProgressRing
            value={percent}
            size={84}
            strokeWidth={7}
            ariaLabel={t('home.next.progressAria', { n: percent })}
            className="shrink-0 [&_circle:first-of-type]:stroke-white/20 [&_circle:last-of-type]:stroke-white"
          >
            <span className="font-display text-2xl text-white tabular-nums">{percent}%</span>
          </ProgressRing>
          <p className="text-sm text-white/90">
            {t('home.next.stepsOf', { done, total: required.length })}
          </p>
        </div>
        <p className="mt-auto inline-flex items-center gap-1.5 text-xs text-white/90">
          <Clock aria-hidden className="size-3.5" />
          {journey.remainingMinutes > 0
            ? t('progress.page.remaining', { time: minutesLabel(journey.remainingMinutes) })
            : t('progress.page.allDone')}
        </p>
      </section>

      <KnowledgeTile
        journey={journey}
        postLabel={postLabel}
        className="sm:order-last sm:col-span-2 lg:order-none lg:col-span-6"
      />

      <section
        aria-labelledby="side-score-title"
        className="qt-grain relative isolate flex flex-col gap-4 overflow-hidden rounded-xl bg-grad-maroon p-5 text-white shadow-[var(--qt-shadow-maroon)] md:p-6 lg:col-span-3"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="side-score-title" className="font-sans text-sm font-medium">
            {side.label}
          </h2>
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/15">
            <SideIcon aria-hidden className="size-4.5" />
          </span>
        </div>
        <ResultValue value={side.value} unit="/100" empty={side.empty} className="self-start" />
        <p className="mt-auto text-xs text-white/90">{side.note}</p>
      </section>
    </div>
  )
}
