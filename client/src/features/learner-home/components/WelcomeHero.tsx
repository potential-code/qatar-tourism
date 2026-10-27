import type { ProgrammeCode } from '@shared/constants'
import { motion, useReducedMotion } from 'motion/react'
import { PhotoPanel } from '@/components/brand/PhotoPanel'
import { easeOut } from '@/components/motion/variants'
import { ProgrammeSwitcher } from '@/features/learning/components/ProgrammeSwitcher'
import type { EnrolmentSummary, Journey } from '@/features/learning/types'
import { qatarDate } from '@/features/learning/utils/format'
import { PROGRAMME_IMAGE } from '@/features/learning/utils/imagery'

/** Overview hero: greeting over official photography, with the explicit programme switcher. */
export function WelcomeHero({
  journey,
  enrolments,
  programme,
  onProgramme,
}: {
  journey: Journey
  enrolments: readonly EnrolmentSummary[]
  programme: ProgrammeCode
  onProgramme: (programme: ProgrammeCode) => void
}) {
  const reduce = useReducedMotion()
  const image = PROGRAMME_IMAGE[programme]
  const { learner, enrolment } = journey
  return (
    <PhotoPanel
      src={image.src}
      alt={image.alt}
      fade="start"
      priority
      className="rounded-xl shadow-md"
    >
      <motion.div
        key={programme}
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: easeOut }}
        className="flex min-h-[19rem] flex-col justify-between gap-8 p-6 pb-28 md:min-h-[22rem] md:p-10 md:pb-28"
      >
        <ProgrammeSwitcher
          enrolments={enrolments}
          value={programme}
          onChange={onProgramme}
          tone="photo"
          className="self-start"
        />
        <div className="flex max-w-2xl flex-col gap-3">
          <h1 className="font-display text-4xl leading-[1.08] font-light text-white md:text-5xl">
            Welcome back, {learner.firstName}
          </h1>
          <p className="max-w-xl text-base text-white/85 md:text-lg">
            {programme === 'B'
              ? `Your path: ${enrolment.pathName ?? 'Visitor Service Essentials'}.`
              : `${enrolment.currentStage}.`}
            {enrolment.lastActivityAt ? ` Last active ${qatarDate(enrolment.lastActivityAt)}.` : ''}
          </p>
        </div>
      </motion.div>
    </PhotoPanel>
  )
}
