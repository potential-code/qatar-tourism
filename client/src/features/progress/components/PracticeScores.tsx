import type { ProgrammeCode } from '@shared/constants'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Lightbulb, MessagesSquare, Mic, Type } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SimulatedTag } from '@/components/layout/SimulatedTag'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import type { Journey } from '@/features/learning/types'
import { mentionsCertification } from '@/features/roleplay/utils/programme'
import { tr } from '@/i18n/localised'
import { qatarDate } from '@/lib/format/qatar-time'

/** Practice scores, tracked separately from knowledge scores (brief §5, §9). */
export function PracticeScores({
  practice,
  programme,
}: {
  practice: Journey['practice']
  programme: ProgrammeCode
}) {
  const { t, i18n } = useTranslation('learner')
  return (
    <section
      aria-labelledby="practice-title"
      className="qt-card-elevated flex flex-col gap-5 rounded-xl p-5 md:p-7"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-maroon-mist text-maroon">
          <MessagesSquare aria-hidden className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col gap-1.5">
          <h2 id="practice-title" className="font-display text-2xl font-normal text-ink">
            {t('progress.practice.title')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {mentionsCertification(programme)
              ? t('progress.practice.subtitle')
              : t('progress.practice.subtitleNoCertificate')}
          </p>
          <SimulatedTag label={tr(practice.label, i18n.language)} className="self-start" />
        </div>
      </div>
      {practice.attempts.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          size="sm"
          className="rounded-xl border border-dashed border-maroon/20 bg-maroon-mist/40"
          title={t('progress.practice.emptyTitle')}
          description={t('progress.practice.emptyDescription')}
          action={
            <Button asChild size="sm" variant="maroon">
              <Link to={'/learner/practice' as never} search={{ programme } as never}>
                {t('progress.practice.goTo')}
                <ArrowRight aria-hidden className="rtl:-scale-x-100" />
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-maroon-mist/60 p-4">
              <dt className="text-xs font-medium text-maroon">{t('progress.practice.best')}</dt>
              <dd className="mt-1 font-display text-3xl text-ink tabular-nums">
                {practice.best}
                <span className="font-sans text-sm text-muted-foreground">/100</span>
              </dd>
            </div>
            <div className="rounded-lg bg-sand p-4">
              <dt className="text-xs font-medium text-muted-foreground">
                {t('progress.practice.latest')}
              </dt>
              <dd className="mt-1 font-display text-3xl text-ink tabular-nums">
                {practice.latest}
                <span className="font-sans text-sm text-muted-foreground">/100</span>
              </dd>
            </div>
          </dl>
          <ul className="flex flex-col divide-y divide-border/70">
            {practice.attempts.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-3 text-sm">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-teal-mist text-teal">
                  {a.mode === 'voice' ? (
                    <Mic aria-hidden className="size-4" />
                  ) : (
                    <Type aria-hidden className="size-4" />
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium text-ink">
                    {tr(a.scenario, i18n.language)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {a.mode === 'voice'
                      ? t('progress.practice.voice')
                      : t('progress.practice.text')}
                    , {qatarDate(a.completedAt)}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-sand-deep px-2.5 py-1 text-xs font-medium text-ink tabular-nums">
                  {a.score}/100
                </span>
              </li>
            ))}
          </ul>
          {practice.latestFeedback ? (
            <p className="flex gap-2.5 rounded-lg bg-teal-mist p-3.5 text-sm text-ink">
              <Lightbulb aria-hidden className="mt-0.5 size-4 shrink-0 text-teal" />
              <span>
                <span className="font-medium">{t('progress.practice.nextTime')}</span>
                {tr(practice.latestFeedback.retry, i18n.language)}
              </span>
            </p>
          ) : null}
        </>
      )}
    </section>
  )
}
