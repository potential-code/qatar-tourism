import { Link } from '@tanstack/react-router'
import { ArrowRight, Clock } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { cardHover } from '@/components/motion/variants'
import { Badge } from '@/components/ui/badge'
import type { ScenarioSummary } from '../types'
import { COMPETENCY_LABEL, SCENARIO_IMAGE } from '../utils/labels'
import { DifficultyPips } from './DifficultyPips'

/** Scenario in the picker: competency, difficulty, duration and this learner's scores. */
export function ScenarioCard({ scenario }: { scenario: ScenarioSummary }) {
  const reduce = useReducedMotion()
  return (
    <motion.article
      initial="rest"
      whileHover={reduce ? undefined : 'hover'}
      whileTap={reduce ? undefined : 'press'}
      variants={cardHover}
      className="group relative grid h-full overflow-hidden rounded-xl border bg-card sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
    >
      <div className="relative aspect-[16/9] overflow-hidden sm:aspect-auto">
        <img
          src={SCENARIO_IMAGE[scenario.key]}
          alt=""
          loading="lazy"
          className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
        />
      </div>
      <div className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-teal/30 text-teal-deep">
            {COMPETENCY_LABEL[scenario.competency]}
          </Badge>
          <DifficultyPips difficulty={scenario.difficulty} />
        </div>
        <h3 className="font-display text-2xl leading-tight font-normal text-ink">
          <Link
            to="/learner/practice/$scenarioKey"
            params={{ scenarioKey: scenario.key }}
            className="after:absolute after:inset-0 focus-visible:outline-none after:focus-visible:rounded-xl after:focus-visible:ring-[3px] after:focus-visible:ring-ring/50"
          >
            {scenario.title}
          </Link>
        </h3>
        <p className="line-clamp-2 text-sm text-muted-foreground italic">
          “{scenario.visitorOpening}”
        </p>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-2">
          <dl className="flex gap-5 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Best</dt>
              <dd className="font-display text-xl tabular-nums text-ink">
                {scenario.best ? (
                  <>
                    {scenario.best.percent}
                    <span className="text-xs text-muted-foreground">/100</span>
                  </>
                ) : (
                  <span className="font-sans text-sm text-muted-foreground">Not yet</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Latest</dt>
              <dd className="font-display text-xl tabular-nums text-ink">
                {scenario.latest ? (
                  <>
                    {scenario.latest.percent}
                    <span className="text-xs text-muted-foreground">/100</span>
                  </>
                ) : (
                  <span className="font-sans text-sm text-muted-foreground">Not yet</span>
                )}
              </dd>
            </div>
          </dl>
          <span className="inline-flex items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Clock aria-hidden className="size-3.5" /> {scenario.estimatedMinutes} min
            </span>
            <span className="inline-flex items-center gap-1 font-medium text-teal">
              {scenario.attempts > 0 ? 'Practise again' : 'Start'}
              <ArrowRight
                aria-hidden
                className="size-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100"
              />
            </span>
          </span>
        </div>
      </div>
    </motion.article>
  )
}
