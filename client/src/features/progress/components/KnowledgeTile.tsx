import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { CornerPattern } from '@/components/brand/CornerPattern'
import type { Journey } from '@/features/learning/types'
import { cn } from '@/lib/utils'
import { ResultValue } from './ResultValue'

/** Baseline, post (or final) and the percentage-point gain, read left to right (brief §5, §8). */
export function KnowledgeTile({
  journey,
  postLabel,
  className,
}: {
  journey: Journey
  postLabel: string
  className?: string
}) {
  const { t } = useTranslation('learner')
  const { baseline, post, gainPoints } = journey.assessments
  const isA = journey.enrolment.programme === 'A'
  const gainText = gainPoints === null ? '' : `${gainPoints >= 0 ? '+' : ''}${gainPoints}`
  return (
    <section
      aria-labelledby="knowledge-title"
      className={cn(
        'qt-grain relative isolate flex flex-col gap-5 overflow-hidden rounded-xl bg-grad-night p-5 text-white shadow-[var(--qt-shadow-lg)] md:p-6',
        className,
      )}
    >
      <CornerPattern side="a" tone="dark" />
      <div>
        <h2 id="knowledge-title" className="font-sans text-sm font-medium text-white">
          {isA ? t('home.scores.titleFinal') : t('home.scores.titlePost')}
        </h2>
        <p className="text-xs text-white/80">
          {t('home.scores.version', { version: baseline?.version ?? 'v1' })}
        </p>
      </div>
      <dl className="grid grid-cols-[1fr_auto_1fr] items-end gap-x-3 gap-y-4 sm:grid-cols-[1fr_auto_1fr_1fr]">
        <div className="flex flex-col gap-2">
          <dt className="text-xs text-white/80">{t('progress.page.baseline')}</dt>
          <dd>
            <ResultValue
              value={baseline?.score ?? null}
              suffix="%"
              empty={t('progress.page.notTaken')}
            />
          </dd>
        </div>
        <ArrowRight aria-hidden className="mb-2 size-5 text-white/60 rtl:-scale-x-100" />
        <div className="flex flex-col gap-2">
          <dt className="text-xs text-white/80">{postLabel}</dt>
          <dd>
            <ResultValue value={post?.score ?? null} suffix="%" empty={t('progress.page.notYet')} />
          </dd>
        </div>
        <div className="col-span-3 flex flex-col gap-2 border-t border-white/15 pt-4 sm:col-span-1 sm:border-t-0 sm:border-s sm:ps-4 sm:pt-0">
          <dt className="text-xs text-white/80">{t('home.scores.improvement')}</dt>
          <dd>
            <ResultValue
              value={gainPoints}
              prefix={gainPoints !== null && gainPoints >= 0 ? '+' : ''}
              empty={t('home.scores.pending')}
              className="text-teal-soft"
            />
          </dd>
        </div>
      </dl>
      <p className="mt-auto text-sm text-white/85">
        {gainPoints !== null
          ? t(isA ? 'home.scores.gainFinal' : 'home.scores.gainPost', { gain: gainText })
          : baseline
            ? t(isA ? 'home.scores.hintFinal' : 'home.scores.hintPost')
            : t('home.scores.hintStart')}
      </p>
    </section>
  )
}
