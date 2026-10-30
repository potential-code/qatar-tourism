import { Link } from '@tanstack/react-router'
import { ArrowRight, History } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { CornerPattern } from '@/components/brand/CornerPattern'
import { ProgressRing } from '@/components/data/ProgressRing'
import { SimulatedTag } from '@/components/layout/SimulatedTag'
import { easeOut } from '@/components/motion/variants'
import { Button } from '@/components/ui/button'
import { ItemIcon } from '@/features/learning/components/ItemIcon'
import type { Journey } from '@/features/learning/types'
import { minutesLabel } from '@/features/learning/utils/format'
import { itemLink, KIND_LABEL } from '@/features/learning/utils/itemLink'
import { tr } from '@/i18n/localised'

/** The one thing to do next (brief §5), lifted over the hero, with progress at a glance. */
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
      className="relative isolate z-10 mx-3 -mt-16 grid md:-mt-20 gap-6 rounded-xl overflow-hidden border border-t-4 border-t-gold bg-white/95 p-5 shadow-lg backdrop-blur md:mx-8 lg:grid-cols-[1fr_auto] lg:items-center md:p-7"
    >
      <CornerPattern side="b" />
      <div className="flex min-w-0 flex-col gap-3">
        <p className="text-sm font-medium text-maroon">{t('home.next.label')}</p>
        {item && next && link ? (
          <>
            <h2
              id="next-action-title"
              className="font-display text-2xl leading-snug font-normal text-ink md:text-3xl"
            >
              {tr(next.label, i18n.language)}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              {item.kind === 'ai_practice' ? null : (
                <span className="inline-flex items-center gap-1.5">
                  <ItemIcon kind={item.kind} courseCode={item.courseCode} className="text-teal" />
                  {KIND_LABEL[item.kind] ?? t('home.next.step')}
                </span>
              )}
              <span>{t('home.next.about', { time: minutesLabel(item.estimatedMinutes) })}</span>
              <span>{tr(item.stage, i18n.language)}</span>
              {item.kind === 'ai_practice' ? (
                <SimulatedTag label={t('home.next.simulatedPractice')} />
              ) : null}
            </div>
            <div className="mt-1 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to={link.to as never} search={link.search as never}>
                  {item.state === 'in_progress' ? t('home.next.continue') : t('home.next.start')}
                  <ArrowRight aria-hidden className="rtl:-scale-x-100" />
                </Link>
              </Button>
              {showResume && resumeItem ? (
                <Button asChild variant="outline" size="lg">
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
              className="font-display text-2xl font-normal text-ink md:text-3xl"
            >
              {journey.complete ? t('home.next.completeTitle') : t('home.next.waitingTitle')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {journey.complete ? t('home.next.completeBody') : t('home.next.waitingBody')}
            </p>
          </>
        )}
      </div>
      <div className="flex items-center gap-4 border-t pt-5 lg:flex-col lg:border-t-0 lg:border-s lg:ps-8 lg:pt-0">
        <ProgressRing
          value={journey.enrolment.progressPercent}
          size={92}
          strokeWidth={8}
          ariaLabel={t('home.next.progressAria', { n: journey.enrolment.progressPercent })}
        >
          <span className="font-display text-2xl text-ink tabular-nums">
            {journey.enrolment.progressPercent}%
          </span>
        </ProgressRing>
        <p className="text-sm text-muted-foreground lg:text-center">
          {t('home.next.stepsOf', { done, total: required.length })}
        </p>
      </div>
    </motion.section>
  )
}
