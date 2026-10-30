import { Link } from '@tanstack/react-router'
import { ArrowRight, Lightbulb } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { SimulatedTag } from '@/components/layout/SimulatedTag'
import { cardHover } from '@/components/motion/variants'
import type { Journey } from '@/features/learning/types'
import { UNIT_IMAGE } from '@/features/learning/utils/imagery'
import { tr } from '@/i18n/localised'

/** Recommended next action: a baseline-gap refresher, or a review after a low post score. */
export function RecommendationCard({ journey }: { journey: Journey }) {
  const reduce = useReducedMotion()
  const { t, i18n } = useTranslation('learner')
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
          <p className="text-sm font-medium text-maroon">{t('home.recommendation.label')}</p>
          <SimulatedTag label={t('home.recommendation.demo')} />
        </div>
        <h2 id="recommendation-title" className="font-display text-2xl font-normal text-ink">
          {tr(rec?.title ?? 'Keep your momentum', i18n.language)}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {tr(rec?.body ?? journey.rationale, i18n.language)}
        </p>
        <Link
          to={(code ? `/learner/learning/${code}` : '/learner/learning/path') as never}
          search={{ programme } as never}
          className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-teal hover:underline"
        >
          {code ? t('home.recommendation.openUnit') : t('home.recommendation.details')}
          <ArrowRight
            aria-hidden
            className="size-4 transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1"
          />
        </Link>
      </div>
    </motion.section>
  )
}
