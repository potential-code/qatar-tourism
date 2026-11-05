import type { ProgrammeCode } from '@shared/constants'
import { Link } from '@tanstack/react-router'
import { ArrowRight, BookOpen, CheckCircle2, Target } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { easeOut } from '@/components/motion/variants'
import { cn } from '@/lib/utils'
import type { AssessmentResult } from '../types'
import { competencyIcon } from '../utils/competency-icons'

type CompetencyResult = AssessmentResult['competencies'][number]

const competencyKey = (key: string) => `competency.${key}` as 'competency.discover_needs'

/**
 * Results by competency: one row per competency with its icon, a segmented meter (one segment per
 * question), "N of M correct" in words, and a status chip with an icon and a word, so the status
 * never depends on colour alone. Weak areas link to a review course where one applies.
 */
export function CompetencyResults({
  competencies,
  programme,
}: {
  competencies: AssessmentResult['competencies']
  programme: ProgrammeCode
}) {
  const { t } = useTranslation('assessments')
  return (
    <section aria-labelledby="by-competency" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="by-competency" className="font-display text-2xl font-normal text-ink md:text-3xl">
          {t('result.byCompetency')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('result.byCompetencyLead')}</p>
      </div>
      <ul className="qt-card-elevated divide-y divide-ink/5 overflow-hidden rounded-xl">
        {competencies.map((c, i) => (
          <CompetencyRow key={c.key} item={c} order={i} programme={programme} />
        ))}
      </ul>
    </section>
  )
}

function CompetencyRow({
  item,
  order,
  programme,
}: {
  item: CompetencyResult
  order: number
  programme: ProgrammeCode
}) {
  const { t } = useTranslation('assessments')
  const reduce = useReducedMotion()
  const Icon = competencyIcon(item.key)
  const total = Math.max(1, item.total)
  return (
    <li className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 p-4 md:p-5">
      <span
        aria-hidden
        className={cn(
          'grid size-11 place-items-center rounded-xl',
          item.strong ? 'bg-teal-mist text-teal' : 'bg-maroon-mist text-maroon',
        )}
      >
        <Icon className="size-5" />
      </span>
      <div className="flex min-w-0 flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          <h3 className="font-medium text-ink">{t(competencyKey(item.key))}</h3>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
              item.strong ? 'bg-teal-mist text-teal-deep' : 'bg-maroon-mist text-maroon-deep',
            )}
          >
            {item.strong ? (
              <CheckCircle2 aria-hidden className="size-3.5" />
            ) : (
              <Target aria-hidden className="size-3.5" />
            )}
            {item.strong ? t('result.statusStrong') : t('result.statusFocus')}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div aria-hidden className="flex h-2 flex-1 gap-1">
            {Array.from({ length: total }, (_, s) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: one segment per question
                key={s}
                className="relative flex-1 overflow-hidden rounded-full bg-ink/10"
              >
                {s < item.correct ? (
                  <motion.span
                    className={cn(
                      'absolute inset-0 origin-left rounded-full rtl:origin-right',
                      item.strong ? 'bg-teal' : 'bg-maroon',
                    )}
                    initial={reduce ? false : { scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.6, ease: easeOut, delay: 0.3 + order * 0.08 }}
                  />
                ) : null}
              </span>
            ))}
          </div>
          <span className="shrink-0 text-sm text-ink tabular-nums">
            {t('result.competencyScore', { correct: item.correct, total: item.total })}
          </span>
        </div>
        {item.review ? (
          <Link
            to="/learner/learning/$code"
            params={{ code: item.review.courseCode }}
            search={{ programme }}
            className="inline-flex items-center gap-1.5 self-start rounded-sm text-sm font-medium text-teal underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <BookOpen aria-hidden className="size-4" />
            {t('result.review', { course: item.review.courseTitle })}
            <ArrowRight aria-hidden className="size-3.5 rtl:-scale-x-100" />
          </Link>
        ) : (
          <p className="text-sm text-muted-foreground">
            {item.strong ? t('result.strong') : t('result.learn')}
          </p>
        )}
      </div>
    </li>
  )
}
