import { CircleCheck } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { CornerPattern, PhotoPanel, StarGlyph } from '@/components/brand'
import { easeOut } from '@/components/motion'
import { cn } from '@/lib/utils'

const HERO_IMAGE = '/images/official/qatar-tourism-banner.jpg'

/** Three small stars that bloom once around the "saved" badge: a brief, quiet celebration. */
const SPARKS = [
  { className: '-top-3 -start-2 size-3.5', delay: 0.35 },
  { className: '-top-4 end-6 size-2.5', delay: 0.5 },
  { className: '-bottom-3 end-0 size-3', delay: 0.65 },
] as const

/** Program B welcome hero: official photography, a "profile saved" moment and the greeting. */
export function ProgramBHero({
  firstName,
  programmeLine,
}: {
  firstName: string
  programmeLine: string
}) {
  const { t } = useTranslation('learner')
  const reduce = useReducedMotion()
  return (
    <PhotoPanel
      src={HERO_IMAGE}
      alt={t('profile.onboarding.heroAlt')}
      fade="start"
      priority
      className="rounded-xl shadow-[var(--qt-shadow-lg)]"
    >
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-t from-teal-night/70 via-transparent to-transparent"
      />
      <CornerPattern side="b" tone="dark" className="opacity-60" />
      <div className="flex min-h-[20rem] flex-col justify-end gap-5 p-6 sm:p-8 md:min-h-[22rem] md:p-10 lg:px-12">
        <motion.p
          initial={reduce ? false : { opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 18 }}
          className="relative inline-flex w-fit items-center gap-2 rounded-full bg-white/15 py-1.5 ps-1.5 pe-4 font-medium text-sm text-white ring-1 ring-white/30 backdrop-blur-md"
        >
          <CircleCheck aria-hidden className="size-6 fill-gold text-teal-night" />
          {t('profile.onboarding.saved')}
          {reduce
            ? null
            : SPARKS.map((spark) => (
                <motion.span
                  key={spark.className}
                  aria-hidden
                  initial={{ opacity: 0, scale: 0, rotate: -45 }}
                  animate={{ opacity: [0, 1, 0.7], scale: [0, 1.2, 1], rotate: 0 }}
                  transition={{ duration: 0.7, delay: spark.delay, ease: easeOut }}
                  className={cn('absolute text-gold', spark.className)}
                >
                  <StarGlyph className="size-full" />
                </motion.span>
              ))}
        </motion.p>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: easeOut }}
          className="grid max-w-2xl gap-3"
        >
          <p className="inline-flex items-center gap-3 font-medium text-gold-soft text-sm">
            <span aria-hidden className="h-px w-8 bg-gold" />
            {programmeLine}
          </p>
          <h1 className="font-display font-light text-5xl text-white leading-[1.04] md:text-6xl">
            {t('profile.welcome.heading', { name: firstName })}
          </h1>
          <p className="max-w-xl text-lg text-white/90 leading-relaxed">
            {t('profile.welcome.intro')}
          </p>
        </motion.div>
      </div>
    </PhotoPanel>
  )
}
