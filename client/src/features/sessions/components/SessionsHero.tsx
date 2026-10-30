import { CheckCircle2, CircleDashed } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { PhotoPanel } from '@/components/brand/PhotoPanel'
import { CountUp } from '@/components/motion/CountUp'
import { easeOut } from '@/components/motion/variants'
import { useSessionFormat } from '../hooks/useSessionFormat'
import type { CatalogueData } from '../types'

/** Photo header: where the learner stands, and the numbers that matter for booking. */
export function SessionsHero({
  catalogue,
  upcomingCount,
  nextStart,
}: {
  catalogue: CatalogueData
  upcomingCount: number
  nextStart: string | null
}) {
  const { t } = useTranslation('sessions')
  const format = useSessionFormat()
  const reduce = useReducedMotion()
  const hasA = catalogue.programmes.some((p) => p.code === 'A')
  const open = catalogue.items.filter((s) => s.eligibility.state === 'bookable').length

  return (
    <PhotoPanel
      src="/images/official/tour-operator.jpg"
      alt={t('hero.imageAlt')}
      fade="start"
      priority
      className="rounded-xl"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-ink/30 md:hidden" />
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: easeOut }}
        className="relative flex min-h-72 flex-col justify-end gap-6 p-6 md:min-h-80 md:p-10"
      >
        <div className="flex max-w-xl flex-col gap-3">
          <h1 className="font-display text-4xl leading-[1.05] font-light text-white md:text-5xl">
            {t('hero.title')}
          </h1>
          <p className="text-white/85">{hasA ? t('hero.introA') : t('hero.introB')}</p>
          {hasA ? (
            <p className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-sm text-white backdrop-blur-md">
              {catalogue.level1.complete ? (
                <CheckCircle2 aria-hidden className="size-4" />
              ) : (
                <CircleDashed aria-hidden className="size-4" />
              )}
              {catalogue.level1.complete ? t('hero.level1Done') : t('hero.level1Todo')}
            </p>
          ) : null}
        </div>
        <dl className="grid max-w-xl grid-cols-3 gap-3 text-white">
          <div>
            <dt className="text-xs text-white/70">{t('hero.upcoming')}</dt>
            <dd className="font-display text-3xl font-light tabular-nums">
              <CountUp value={upcomingCount} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-white/70">{t('hero.open')}</dt>
            <dd className="font-display text-3xl font-light tabular-nums">
              <CountUp value={open} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-white/70">{t('hero.next')}</dt>
            <dd className="font-display text-xl font-light md:text-2xl">
              {nextStart
                ? `${format.dateShort(nextStart)}, ${format.time(nextStart)}`
                : t('hero.none')}
            </dd>
          </div>
        </dl>
      </motion.div>
    </PhotoPanel>
  )
}
