import type { ProgrammeCode } from '@shared/constants'
import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { PhotoPanel } from '@/components/brand/PhotoPanel'
import { easeOut } from '@/components/motion/variants'
import { ProgrammeSwitcher } from '@/features/learning/components/ProgrammeSwitcher'
import type { EnrolmentSummary, Journey } from '@/features/learning/types'
import { PROGRAMME_IMAGE } from '@/features/learning/utils/imagery'
import { tr } from '@/i18n/localised'
import { qatarDate } from '@/lib/format/qatar-time'

/**
 * Overview hero: greeting over official photography, with the explicit programme switcher.
 * The next action (`children`) sits inside the hero on a dark glass band, never lifted over it.
 */
export function WelcomeHero({
  journey,
  enrolments,
  programme,
  onProgramme,
  children,
}: {
  journey: Journey
  enrolments: readonly EnrolmentSummary[]
  programme: ProgrammeCode
  onProgramme: (programme: ProgrammeCode) => void
  children?: ReactNode
}) {
  const reduce = useReducedMotion()
  const { t, i18n } = useTranslation('learner')
  const image = PROGRAMME_IMAGE[programme]
  const { learner, enrolment } = journey
  return (
    <PhotoPanel
      src={image.src}
      alt={image.alt}
      fade="start"
      priority
      className="rounded-xl shadow-lg"
    >
      {/* The side fade alone leaves bright photo behind the bottom band and on narrow screens. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-ink/80 via-ink/30 to-transparent"
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-ink/25 md:hidden" />
      <div className="flex min-h-[19rem] flex-col gap-8 p-4 sm:p-6 md:min-h-[24rem] md:p-8 lg:p-10">
        <motion.div
          key={programme}
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easeOut }}
          className="flex flex-1 flex-col justify-between gap-8 px-2 pt-2 sm:px-0 sm:pt-0"
        >
          <ProgrammeSwitcher
            enrolments={enrolments}
            value={programme}
            onChange={onProgramme}
            tone="photo"
            className="self-start"
          />
          <div className="flex max-w-2xl flex-col gap-3">
            <h1 className="font-display text-4xl leading-[1.08] font-light text-white text-shadow-sm md:text-5xl">
              {t('home.welcome', { name: learner.firstName })}
            </h1>
            <p className="max-w-xl text-base text-white/90 md:text-lg">
              {programme === 'B'
                ? t('home.yourPath', {
                    path: tr(enrolment.pathName ?? 'Visitor Service Essentials', i18n.language),
                  })
                : `${tr(enrolment.currentStage, i18n.language)}.`}
              {enrolment.lastActivityAt
                ? ` ${t('home.lastActive', { date: qatarDate(enrolment.lastActivityAt) })}`
                : ''}
            </p>
          </div>
        </motion.div>
        {children}
      </div>
    </PhotoPanel>
  )
}
