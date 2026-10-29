import { Link } from '@tanstack/react-router'
import { ArrowRight, Lightbulb } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { SimulatedTag } from '@/components/layout/SimulatedTag'
import { cardHover } from '@/components/motion/variants'
import type { Journey } from '@/features/learning/types'
import { UNIT_IMAGE } from '@/features/learning/utils/imagery'

/** Recommended next action: a baseline-gap refresher, or a review after a low post score. */
export function RecommendationCard({ journey }: { journey: Journey }) {
  const reduce = useReducedMotion()
  const programme = journey.enrolment.programme
  const rec = journey.recommendation
  const code = rec?.courseCode ?? null
  return (
    <motion.section
      aria-labelledby="recommendation-title"
      initial="rest"
      whileHover={reduce ? undefined : 'hover'}
      variants={cardHover}
      className="group grid overflow-hidden rounded-xl border bg-gradient-to-r from-white to-gold-soft/60 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
    >
      <div className="relative aspect-[16/9] overflow-hidden sm:aspect-auto">
        <img
          src={
            code
              ? (UNIT_IMAGE[code] ?? UNIT_IMAGE.C04)
              : '/images/official/qatar-tourism-banner.jpg'
          }
          alt=""
          loading="lazy"
          className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-col gap-3 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Lightbulb aria-hidden className="size-4 text-maroon" />
          <p className="text-sm font-medium text-maroon">Recommended next action</p>
          <SimulatedTag label="Demo mode" />
        </div>
        <h2 id="recommendation-title" className="font-display text-2xl font-normal text-ink">
          {rec?.title ?? 'Keep your momentum'}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {rec?.body ?? journey.rationale}
        </p>
        <Link
          to={(code ? `/learner/learning/${code}` : '/learner/learning/path') as never}
          search={{ programme } as never}
          className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-teal hover:underline"
        >
          {code ? 'Open the unit' : 'View recommendation details'}
          <ArrowRight
            aria-hidden
            className="size-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100"
          />
        </Link>
      </div>
    </motion.section>
  )
}
