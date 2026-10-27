import { Link } from '@tanstack/react-router'
import { ArrowUpRight, TrendingUp } from 'lucide-react'
import { CountUp } from '@/components/motion/CountUp'
import { Button } from '@/components/ui/button'
import type { Journey } from '@/features/learning/types'

/** Baseline and post results with the percentage-point gain (brief §5, §8: matched attempts). */
export function ScoreCard({ journey }: { journey: Journey }) {
  const { baseline, post, gainPoints } = journey.assessments
  const programme = journey.enrolment.programme
  const postLabel = programme === 'A' ? 'Final' : 'Post'
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
            Baseline and {postLabel.toLowerCase()}
          </h2>
          <p className="text-sm text-white/75">
            Knowledge assessment, version {baseline?.version ?? 'v1'}
          </p>
        </div>
        <TrendingUp aria-hidden className="size-6 text-teal-soft" />
      </div>
      <dl className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-white/70">Baseline</dt>
          <dd className="font-display text-4xl font-light tabular-nums">
            {baseline ? (
              <CountUp value={baseline.score} suffix="%" />
            ) : (
              <span className="text-2xl text-white/70">None</span>
            )}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-white/70">{postLabel}</dt>
          <dd className="font-display text-4xl font-light tabular-nums">
            {post ? (
              <CountUp value={post.score} suffix="%" />
            ) : (
              <span className="text-2xl text-white/70">Not yet</span>
            )}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs text-white/70">Improvement</dt>
          <dd className="font-display text-4xl font-light tabular-nums text-teal-soft">
            {gainPoints !== null ? (
              <CountUp value={gainPoints} prefix={gainPoints >= 0 ? '+' : ''} />
            ) : (
              <span className="text-2xl text-white/70">Pending</span>
            )}
          </dd>
        </div>
      </dl>
      <p className="text-sm text-white/80">
        {gainPoints !== null
          ? `${gainPoints >= 0 ? '+' : ''}${gainPoints} percentage points from your matched baseline and ${postLabel.toLowerCase()} attempts.`
          : baseline
            ? `Your ${programme === 'A' ? 'final assessment' : 'post-assessment'} uses new scenarios on the same five competencies, so you can see your improvement.`
            : 'Start with the five-question baseline. It identifies useful learning and is not an entry barrier.'}
      </p>
      <Button asChild variant="glass" className="self-start">
        <Link to="/learner/assessments" search={{ programme }}>
          View assessments <ArrowUpRight aria-hidden className="rtl:-scale-x-100" />
        </Link>
      </Button>
    </section>
  )
}
