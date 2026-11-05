import { Link } from '@tanstack/react-router'
import { ArrowRight, CircleCheck, Clock, ListChecks, Lock, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { SimulatedTag } from '@/components/layout/SimulatedTag'
import { Reveal } from '@/components/motion/Reveal'
import { Button } from '@/components/ui/button'
import { tr } from '@/i18n/localised'
import type { Journey, ProgrammeCode } from '../../types'
import type { MenuItem } from '../../utils/courseMenu'
import { minutesLabel } from '../../utils/format'
import { itemLink } from '../../utils/itemLink'
import { ItemIcon } from '../ItemIcon'
import { ResumeBanner } from '../ResumeBanner'
import { StageMap } from '../StageMap'
import { useItemTypeLabel } from './useItemTypeLabel'

/**
 * The path overview pane: what My learning opens on (brief §5 step 4). The next step, resume at
 * last activity, A's levels and stages, and why this path was recommended (brief §9). Every
 * step itself lives in the course menu beside it, so nothing here repeats the list.
 */
export function PathOverview({
  journey,
  programme,
  items,
}: {
  journey: Journey
  programme: ProgrammeCode
  items: readonly MenuItem[]
}) {
  const { t, i18n } = useTranslation('learner')
  const next = journey.nextAction
    ? items.find((i) => i.id === journey.nextAction?.itemId)
    : undefined
  const required = items.filter((i) => i.required)
  const done = required.filter((i) => i.state === 'completed').length
  const recommended = items.filter((i) => !i.required).length
  const resumeIsNext = next?.kind === 'course' && next.courseCode === journey.resume?.courseCode

  return (
    <article className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-medium tracking-[0.18em] text-maroon uppercase">
          {t('learning.course.overview')}
        </p>
        <h1 className="font-display text-3xl leading-tight font-normal text-ink md:text-4xl">
          {t('learning.page.title')}
        </h1>
      </header>

      {next ? (
        <NextStep item={next} programme={programme} />
      ) : (
        <Reveal className="flex items-start gap-4 rounded-xl border border-teal/20 bg-teal-mist/60 p-6">
          <CircleCheck aria-hidden className="mt-0.5 size-6 shrink-0 text-teal" />
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-2xl font-normal text-ink">
              {t('learning.course.allDoneTitle')}
            </h2>
            <p className="text-sm text-muted-foreground">{t('learning.course.allDoneBody')}</p>
          </div>
        </Reveal>
      )}

      {journey.resume && !resumeIsNext ? <ResumeBanner journey={journey} /> : null}

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat
          icon={<ListChecks aria-hidden className="size-4" />}
          label={t('learning.page.required')}
          value={t('learning.course.doneOf', { done, total: required.length })}
        />
        <Stat
          icon={<Clock aria-hidden className="size-4" />}
          label={t('learning.course.remaining')}
          value={minutesLabel(journey.remainingMinutes)}
        />
        <Stat
          icon={<Sparkles aria-hidden className="size-4" />}
          label={t('learning.page.recommended')}
          value={
            recommended > 0
              ? t('learning.course.recommendedCount', { count: recommended })
              : t('learning.course.recommendedNone')
          }
        />
      </ul>

      {journey.gates.length > 0 ? (
        <Reveal className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-5 font-display text-2xl font-normal text-ink">
            {t('learning.page.levelsAndStages')}
          </h2>
          <StageMap gates={journey.gates} />
        </Reveal>
      ) : null}

      <section
        aria-labelledby="why-path-title"
        className="flex flex-col gap-3 rounded-xl bg-teal-deep p-6 text-white shadow-md"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Sparkles aria-hidden className="size-4 text-teal-soft" />
          <h2 id="why-path-title" className="text-sm font-medium">
            {t('learning.page.whyThisPath')}
          </h2>
          <SimulatedTag
            label={t('learning.page.demoMode')}
            className="border-white/20 bg-white/10 text-white"
          />
        </div>
        <p className="max-w-3xl font-display text-lg leading-relaxed font-light text-white/90">
          {tr(journey.rationale, i18n.language)}
        </p>
        <Button asChild variant="glass" size="sm" className="self-start">
          <Link to="/learner/learning/path" search={{ programme }}>
            {t('learning.page.viewDetails')} <ArrowRight aria-hidden className="rtl:-scale-x-100" />
          </Link>
        </Button>
      </section>
    </article>
  )
}

/** The one thing to do now, with its action. */
function NextStep({ item, programme }: { item: MenuItem; programme: ProgrammeCode }) {
  const { t, i18n } = useTranslation('learner')
  const typeLabel = useItemTypeLabel(item)
  const link = itemLink(item, programme)
  const started = item.state === 'in_progress'
  const locked = item.state === 'locked'
  return (
    <Reveal className="relative overflow-hidden rounded-xl border border-maroon/15 bg-white shadow-sm">
      <section
        aria-labelledby="next-step-title"
        className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between md:p-7"
      >
        <div className="flex min-w-0 items-start gap-4">
          <span
            aria-hidden
            className="grid size-12 shrink-0 place-items-center rounded-full bg-maroon-mist text-maroon"
          >
            <ItemIcon kind={item.kind} courseCode={item.courseCode} className="size-5" />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-xs font-medium tracking-[0.14em] text-maroon uppercase">
              {t('learning.course.nextStep')} · {typeLabel}
            </p>
            <h2
              id="next-step-title"
              className="font-display text-2xl leading-snug font-normal text-ink"
            >
              {tr(item.title, i18n.language)}
            </h2>
            <p className="text-sm text-muted-foreground">
              {minutesLabel(item.estimatedMinutes)}
              {locked && item.lockReason ? ` · ${tr(item.lockReason, i18n.language)}` : null}
            </p>
          </div>
        </div>
        {locked ? (
          <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-sand-deep px-3 py-1.5 text-sm text-muted-foreground sm:self-center">
            <Lock aria-hidden className="size-3.5" /> {t('learning.state.locked')}
          </span>
        ) : (
          <Button asChild size="lg" variant="maroon" className="shrink-0 self-start sm:self-center">
            <Link to={link.to as never} search={link.search as never}>
              {started ? t('learning.course.continue') : t('learning.course.start')}
              <ArrowRight aria-hidden className="rtl:-scale-x-100" />
            </Link>
          </Button>
        )}
      </section>
    </Reveal>
  )
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <li className="flex flex-col gap-1 rounded-xl border bg-white p-4 shadow-xs">
      <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className="text-teal">{icon}</span>
        {label}
      </span>
      <span className="font-display text-xl text-ink">{value}</span>
    </li>
  )
}
