import { Link } from '@tanstack/react-router'
import { ArrowRight, History } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { ProgressRing } from '@/components/data/ProgressRing'
import { SimulatedTag } from '@/components/layout/SimulatedTag'
import { easeOut } from '@/components/motion/variants'
import { Button } from '@/components/ui/button'
import { ItemIcon } from '@/features/learning/components/ItemIcon'
import type { Journey } from '@/features/learning/types'
import { displayStage } from '@/features/learning/utils/courseMenu'
import { minutesLabel } from '@/features/learning/utils/format'
import { itemLink, KIND_LABEL } from '@/features/learning/utils/itemLink'
import { tr } from '@/i18n/localised'

/**
 * The one thing to do next (brief §5), on a dark glass band inside the welcome hero, with
 * progress at a glance. The teal-night/75 ground keeps white text above 4.5:1 over any photograph.
 */
export function NextActionCard({ journey }: { journey: Journey }) {
  const reduce = useReducedMotion()
  const { t, i18n } = useTranslation('learner')
  const programme = journey.enrolment.programme
  const next = journey.nextAction
  const item = next ? journey.items.find((i) => i.id === next.itemId) : undefined
  const required = journey.items.filter((i) => i.required)
  const done = required.filter((i) => i.state === 'completed').length
  const link = item ? itemLink(item, programme) : null
  const resumeItem = journey.resume
    ? journey.items.find((i) => i.courseCode === journey.resume?.courseCode)
    : undefined
  const showResume = resumeItem && resumeItem.id !== item?.id

  return (
    <motion.section
      aria-labelledby="next-action-title"
      initial={reduce ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: easeOut, delay: 0.15 }}
      className="grid gap-5 rounded-xl border border-white/20 bg-teal-night/75 p-5 text-white shadow-[var(--qt-shadow-lg)] ring-1 ring-black/5 backdrop-blur-md md:gap-6 md:p-6 lg:grid-cols-[1fr_auto] lg:items-center"
    >
      <div className="flex min-w-0 flex-col gap-3">
        <p className="inline-flex items-center gap-2 text-xs font-medium tracking-[0.14em] text-white/85 uppercase">
          <span aria-hidden className="h-px w-6 bg-white/60" />
          {t('home.next.label')}
        </p>
        {item && next && link ? (
          <>
            <h2
              id="next-action-title"
              className="font-display text-2xl leading-snug font-normal text-white md:text-3xl"
            >
              {tr(next.label, i18n.language)}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/85">
              {item.kind === 'ai_practice' ? null : (
                <span className="inline-flex items-center gap-1.5">
                  <ItemIcon
                    kind={item.kind}
                    courseCode={item.courseCode}
                    className="text-teal-soft"
                  />
                  {KIND_LABEL[item.kind] ?? t('home.next.step')}
                </span>
              )}
              <span>{t('home.next.about', { time: minutesLabel(item.estimatedMinutes) })}</span>
              <span>{tr(displayStage(journey, item), i18n.language)}</span>
              {item.kind === 'ai_practice' ? (
                <SimulatedTag label={t('home.next.simulatedPractice')} />
              ) : null}
            </div>
            <div className="mt-1 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="maroon">
                <Link to={link.to as never} search={link.search as never}>
                  {item.state === 'in_progress' ? t('home.next.continue') : t('home.next.start')}
                  <ArrowRight aria-hidden className="rtl:-scale-x-100" />
                </Link>
              </Button>
              {showResume && resumeItem ? (
                <Button asChild variant="glass" size="lg">
                  <Link
                    to={itemLink(resumeItem, programme).to as never}
                    search={itemLink(resumeItem, programme).search as never}
                  >
                    <History aria-hidden />{' '}
                    {t('home.next.resume', { title: tr(resumeItem.title, i18n.language) })}
                  </Link>
                </Button>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <h2
              id="next-action-title"
              className="font-display text-2xl font-normal text-white md:text-3xl"
            >
              {journey.complete ? t('home.next.completeTitle') : t('home.next.waitingTitle')}
            </h2>
            <p className="text-sm text-white/85">
              {journey.complete ? t('home.next.completeBody') : t('home.next.waitingBody')}
            </p>
          </>
        )}
      </div>
      <div className="flex items-center gap-4 border-t border-white/15 pt-5 lg:flex-col lg:border-t-0 lg:border-s lg:ps-8 lg:pt-0">
        <ProgressRing
          value={journey.enrolment.progressPercent}
          size={88}
          strokeWidth={7}
          className="shrink-0 [&_circle:first-of-type]:stroke-white/20 [&_circle:last-of-type]:stroke-teal-soft"
          ariaLabel={t('home.next.progressAria', { n: journey.enrolment.progressPercent })}
        >
          <span className="font-display text-2xl text-white tabular-nums">
            {journey.enrolment.progressPercent}%
          </span>
        </ProgressRing>
        <p className="text-sm text-white/85 lg:max-w-[9rem] lg:text-center">
          {t('home.next.stepsOf', { done, total: required.length })}
        </p>
      </div>
    </motion.section>
  )
}
