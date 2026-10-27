import type { ProgrammeCode } from '@shared/constants'
import { Link } from '@tanstack/react-router'
import { ArrowRight, BookOpen, CheckCircle2, CircleAlert, CircleMinus } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { ProgressRing } from '@/components/data/ProgressRing'
import { CountUp } from '@/components/motion/CountUp'
import { easeOut } from '@/components/motion/variants'
import { Button } from '@/components/ui/button'
import { qatarDateTime } from '@/features/learning/utils/format'
import { cn } from '@/lib/utils'
import type { AssessmentResult } from '../types'

/** Results by competency, with matched baseline vs post and targeted review (brief §8). */
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
  const reduce = useReducedMotion()
  const verdict =
    result.passed === null
      ? null
      : result.passed
        ? {
            icon: CheckCircle2,
            text: `Passed. The pass mark is ${result.passMark} percent.`,
            tone: 'text-teal',
          }
        : {
            icon: CircleAlert,
            text: `Not yet passed. You need ${result.passMark} percent. Review the areas below and retry.`,
            tone: 'text-maroon',
          }

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
          ariaLabel={`Score ${result.score} percent`}
        >
          <span className="font-display text-4xl text-ink tabular-nums">
            <CountUp value={result.score} suffix="%" />
          </span>
        </ProgressRing>
        <div className="flex flex-col gap-2">
          <h2 id="result-title" className="font-display text-3xl font-light text-ink">
            {result.title} result
          </h2>
          <p className="text-sm text-muted-foreground">
            Attempt {result.attemptNo}, version {result.version}, submitted{' '}
            {qatarDateTime(result.submittedAt)} Qatar time
          </p>
          {verdict ? (
            <p className={cn('flex items-center gap-2 font-medium', verdict.tone)}>
              <verdict.icon aria-hidden className="size-5" /> {verdict.text}
            </p>
          ) : null}
          {result.note ? <p className="max-w-[65ch] text-sm text-ink/80">{result.note}</p> : null}
          {result.reviewSuggested ? (
            <p className="max-w-[65ch] text-sm text-maroon-deep">
              Below 80 percent: a short review of your lowest areas is suggested. It does not block
              completing Program B.
            </p>
          ) : null}
        </div>
      </motion.section>

      {result.comparison ? (
        <section
          aria-labelledby="comparison-title"
          className="grid gap-4 rounded-xl bg-teal-deep p-6 text-white shadow-md sm:grid-cols-3"
        >
          <h2 id="comparison-title" className="sr-only">
            Baseline compared with this attempt
          </h2>
          {[
            ['Baseline', `${result.comparison.baseline}%`],
            [programme === 'A' ? 'Final' : 'Post', `${result.comparison.post}%`],
            [
              'Improvement',
              `${result.comparison.gainPoints >= 0 ? '+' : ''}${result.comparison.gainPoints} points`,
            ],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1">
              <p className="text-sm text-white/70">{label}</p>
              <p className="font-display text-4xl font-light">{value}</p>
            </div>
          ))}
          <p className="text-sm text-white/75 sm:col-span-3">
            Matched attempts: your first baseline and this attempt on the same enrolment.
          </p>
        </section>
      ) : null}

      <section aria-labelledby="by-competency" className="flex flex-col gap-3">
        <h2 id="by-competency" className="font-display text-2xl font-normal text-ink">
          Results by competency
        </h2>
        <ul className="grid gap-3 md:grid-cols-2">
          {result.competencies.map((c) => (
            <li key={c.key} className="flex flex-col gap-2 rounded-xl border bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-ink">{c.label}</p>
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
                  {c.points} / 20
                </span>
              </div>
              {c.review ? (
                <Link
                  to="/learner/learning/$code"
                  params={{ code: c.review.courseCode }}
                  search={{ programme }}
                  className="inline-flex items-center gap-1.5 text-sm text-teal hover:underline"
                >
                  <BookOpen aria-hidden className="size-4" /> Review: {c.review.courseTitle}
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {c.strong ? 'A strong area.' : 'A useful area to learn. Your path covers it.'}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap gap-3">
        {result.kind === 'pre' ? (
          <Button asChild size="lg">
            <Link to="/learner/learning/path" search={{ programme }}>
              Build my learning path <ArrowRight aria-hidden className="rtl:-scale-x-100" />
            </Link>
          </Button>
        ) : null}
        {canRetry && onRetry ? (
          <Button
            size="lg"
            variant={result.kind === 'pre' ? 'outline' : 'default'}
            onClick={onRetry}
          >
            Retry
          </Button>
        ) : null}
        <Button asChild size="lg" variant="outline">
          <Link to="/learner/assessments" search={{ programme }}>
            All assessments
          </Link>
        </Button>
      </div>
    </div>
  )
}
