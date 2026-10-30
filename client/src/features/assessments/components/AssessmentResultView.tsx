import type { ProgrammeCode } from '@shared/constants'
import { Link } from '@tanstack/react-router'
import { ArrowRight, BookOpen, CheckCircle2, CircleAlert, CircleMinus, Timer } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { ProgressRing } from '@/components/data/ProgressRing'
import { CountUp } from '@/components/motion/CountUp'
import { easeOut } from '@/components/motion/variants'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AssessmentResult } from '../types'
import { formatAttemptDate, kindLabel } from '../utils/format'
import { ImprovementBanner } from './ImprovementBanner'
import { ResultReview } from './ResultReview'

const competencyKey = (key: string) => `competency.${key}` as 'competency.discover_needs'

/**
 * The result: score and verdict, whether the time limit ended the attempt, attempts left,
 * improvement against the baseline, results by competency, skill gaps, and the question review.
 */
export function AssessmentResultView({
  result,
  programme,
  canRetry,
  onRetry,
}: {
  result: AssessmentResult
  programme: ProgrammeCode
  canRetry: boolean
  onRetry?: () => void
}) {
  const { t, i18n } = useTranslation('assessments')
  const reduce = useReducedMotion()
  const verdict =
    result.passed === null
      ? null
      : result.passed
        ? {
            icon: CheckCircle2,
            text: t('result.passed', { mark: result.passMark }),
            tone: 'text-teal',
          }
        : {
            icon: CircleAlert,
            text: t('result.failed', { mark: result.passMark }),
            tone: 'text-maroon',
          }
  const title = kindLabel(t, result.kind, programme)

  return (
    <div className="flex flex-col gap-6">
      <motion.section
        aria-labelledby="result-title"
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easeOut }}
        className="grid gap-6 rounded-xl border bg-white p-6 shadow-sm md:grid-cols-[auto_1fr] md:items-center md:p-8"
      >
        <ProgressRing
          value={result.score}
          size={128}
          strokeWidth={10}
          ariaLabel={t('result.score', { n: result.score })}
        >
          <span className="font-display text-4xl text-ink tabular-nums" dir="ltr">
            <CountUp value={result.score} suffix="%" />
          </span>
        </ProgressRing>
        <div className="flex flex-col gap-2">
          <h2 id="result-title" className="font-display text-3xl font-light text-ink">
            {t('result.title', { title })}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('result.attemptLine', {
              no: result.attemptNo,
              date: formatAttemptDate(result.submittedAt, i18n.language),
            })}
            {result.earnedPoints !== null
              ? ` · ${t('result.points', { earned: result.earnedPoints, possible: result.possiblePoints })}`
              : ''}
            {result.possiblePoints !== null
              ? ` · ${t('result.language', { lang: t(`lang.${result.language}`) })}`
              : ''}
          </p>
          {verdict ? (
            <p className={cn('flex items-center gap-2 font-medium', verdict.tone)}>
              <verdict.icon aria-hidden className="size-5 shrink-0" /> {verdict.text}
            </p>
          ) : null}
          {result.passed === false && result.gate === 'advisory' ? (
            <p className="max-w-[65ch] text-sm text-ink/80">{t('result.advisory')}</p>
          ) : null}
          {result.kind === 'pre' ? (
            <p className="max-w-[65ch] text-sm text-ink/80">{t('result.baselineNote')}</p>
          ) : null}
          {result.attemptLimit !== null && result.kind === 'post' ? (
            <p className="text-sm text-ink/80">
              {t('result.attemptsRemaining', {
                left: result.attemptsRemaining ?? 0,
                total: result.attemptLimit,
              })}
              {result.counted !== null
                ? ` · ${t('result.counted', { score: result.counted, policy: t(`policy.${result.scorePolicy}`) })}`
                : ''}
            </p>
          ) : null}
        </div>
      </motion.section>

      {result.autoSubmitted ? (
        <section
          role="status"
          className="flex items-start gap-3 rounded-xl border border-maroon/30 bg-maroon-mist p-4 text-maroon-deep"
        >
          <Timer aria-hidden className="mt-0.5 size-5 shrink-0" />
          <div className="flex flex-col gap-1">
            <h2 className="font-medium">{t('result.autoTitle')}</h2>
            <p className="text-sm">
              {t('result.autoBody', {
                answered: result.answeredCount,
                total: result.questionCount,
              })}
            </p>
          </div>
        </section>
      ) : null}

      {result.limitReached ? (
        <section
          role="alert"
          className="flex flex-col gap-1 rounded-xl border border-maroon/30 bg-white p-4"
        >
          <h2 className="font-medium text-maroon">{t('result.limitReached')}</h2>
          <p className="text-sm text-ink/80">{t('result.limitHelp')}</p>
        </section>
      ) : null}

      {result.comparison ? (
        <ImprovementBanner
          comparison={result.comparison}
          programme={programme}
          policy={result.scorePolicy}
        />
      ) : null}

      {result.kind === 'pre' ? (
        <section className="rounded-xl bg-teal-mist p-4 text-sm text-teal-deep">
          <h2 className="font-medium">{t('result.gapsTitle')}</h2>
          <p className="mt-1">
            {result.gaps.length > 0
              ? t('result.gapsBody', {
                  list: result.gaps
                    .map((g) => t(competencyKey(g)))
                    .join(i18n.language === 'ar' ? '، ' : ', '),
                })
              : t('result.gapsNone')}
          </p>
        </section>
      ) : null}

      <section aria-labelledby="by-competency" className="flex flex-col gap-3">
        <h2 id="by-competency" className="font-display text-2xl font-normal text-ink">
          {t('result.byCompetency')}
        </h2>
        <ul className="grid gap-3 md:grid-cols-2">
          {result.competencies.map((c) => (
            <li key={c.key} className="flex flex-col gap-2 rounded-xl border bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-ink">{t(competencyKey(c.key))}</p>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                    c.strong ? 'bg-teal-mist text-teal-deep' : 'bg-maroon-mist text-maroon-deep',
                  )}
                >
                  {c.strong ? (
                    <CheckCircle2 aria-hidden className="size-3.5" />
                  ) : (
                    <CircleMinus aria-hidden className="size-3.5" />
                  )}
                  {t('result.competencyScore', { correct: c.correct, total: c.total })}
                </span>
              </div>
              {c.review ? (
                <Link
                  to="/learner/learning/$code"
                  params={{ code: c.review.courseCode }}
                  search={{ programme }}
                  className="inline-flex items-center gap-1.5 text-sm text-teal hover:underline"
                >
                  <BookOpen aria-hidden className="size-4" />{' '}
                  {t('result.review', { course: c.review.courseTitle })}
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {c.strong ? t('result.strong') : t('result.learn')}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      {result.feedbackHeld ? (
        <p className="rounded-xl border bg-white p-4 text-sm text-muted-foreground" role="status">
          {t('result.feedbackHeld')}
        </p>
      ) : (
        <ResultReview review={result.review} />
      )}

      <div className="flex flex-wrap gap-3">
        {result.kind === 'pre' ? (
          <Button asChild size="lg">
            <Link to="/learner/learning/path" search={{ programme }}>
              {t('result.buildPath')} <ArrowRight aria-hidden className="rtl:-scale-x-100" />
            </Link>
          </Button>
        ) : null}
        {canRetry && onRetry ? (
          <Button
            size="lg"
            variant={result.kind === 'pre' ? 'outline' : 'default'}
            onClick={onRetry}
          >
            {t('result.retry')}
          </Button>
        ) : null}
        <Button asChild size="lg" variant="outline">
          <Link to="/learner/assessments" search={{ programme }}>
            {t('result.all')}
          </Link>
        </Button>
      </div>
    </div>
  )
}
