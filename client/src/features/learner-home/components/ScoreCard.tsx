import { Link } from '@tanstack/react-router'
import { ArrowUpRight, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { CountUp } from '@/components/motion/CountUp'
import { Button } from '@/components/ui/button'
import type { Journey } from '@/features/learning/types'

/** Baseline and post results with the percentage-point gain (brief §5, §8: matched attempts). */
export function ScoreCard({ journey }: { journey: Journey }) {
  const { t } = useTranslation('learner')
  const { baseline, post, gainPoints } = journey.assessments
  const programme = journey.enrolment.programme
  const isA = programme === 'A'
  const postLabel = isA ? t('home.final') : t('home.post')
  const gainText = gainPoints === null ? '' : `${gainPoints >= 0 ? '+' : ''}${gainPoints}`
  return (
    <section
      aria-labelledby="scores-title"
      className="relative isolate flex flex-col gap-6 overflow-hidden rounded-xl bg-teal-deep p-6 text-white shadow-md"
    >
      <div
        aria-hidden
        className="absolute -end-16 -top-16 -z-10 size-56 rounded-full bg-teal/60 blur-2xl"
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="scores-title" className="font-display text-2xl font-normal">
            {isA ? t('home.scores.titleFinal') : t('home.scores.titlePost')}
          </h2>
          <p className="text-sm text-white/75">
            {t('home.scores.version', { version: baseline?.version ?? 'v1' })}
          </p>
        </div>
        <TrendingUp aria-hidden className="size-6 text-teal-soft" />
      </div>
      <dl className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-white/70">{t('home.scores.baseline')}</dt>
          <dd className="font-display text-4xl font-light tabular-nums">
            {baseline ? (
              <CountUp value={baseline.score} suffix="%" />
            ) : (
              <span className="text-2xl text-white/70">{t('home.scores.none')}</span>
            )}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-white/70">{postLabel}</dt>
          <dd className="font-display text-4xl font-light tabular-nums">
            {post ? (
              <CountUp value={post.score} suffix="%" />
            ) : (
              <span className="text-2xl text-white/70">{t('home.scores.notYet')}</span>
            )}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-white/70">{t('home.scores.improvement')}</dt>
          <dd className="font-display text-4xl font-light tabular-nums text-teal-soft">
            {gainPoints !== null ? (
              <span dir="ltr">
                <CountUp value={gainPoints} prefix={gainPoints >= 0 ? '+' : ''} />
              </span>
            ) : (
              <span className="text-2xl text-white/70">{t('home.scores.pending')}</span>
            )}
          </dd>
        </div>
      </dl>
      <p className="text-sm text-white/80">
        {gainPoints !== null
          ? t(isA ? 'home.scores.gainFinal' : 'home.scores.gainPost', { gain: gainText })
          : baseline
            ? t(isA ? 'home.scores.hintFinal' : 'home.scores.hintPost')
            : t('home.scores.hintStart')}
      </p>
      <Button asChild variant="glass" className="self-start">
        <Link to="/learner/assessments" search={{ programme }}>
          {t('home.scores.view')} <ArrowUpRight aria-hidden className="rtl:-scale-x-100" />
        </Link>
      </Button>
    </section>
  )
}
