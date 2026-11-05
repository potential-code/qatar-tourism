import { ShieldCheck } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { ArchFrame, CornerPattern, GoldArch } from '@/components/brand'
import { easeOut } from '@/components/motion'
import { cn } from '@/lib/utils'

const IMAGES = [
  { src: '/images/official/waldorf-astoria-doha-west-bay-2.jpg', alt: 'profile.panel.imgHotel' },
  {
    src: '/images/official/grid-qatar-national-library-2-7740-wip-5.jpg',
    alt: 'profile.panel.imgLibrary',
  },
  { src: '/images/official/al-hazm-0024.jpg', alt: 'profile.panel.imgFamily' },
] as const

const JOURNEY = ['journey1', 'journey2', 'journey3'] as const

/**
 * Side panel for the wizard: a deep-teal ground with the star tile, the one arch accent on the
 * page (its photo changes with the step), how the data is used, and what comes after the profile.
 */
export function WhyWeAskPanel({ step, name }: { step: number; name: string }) {
  const { t } = useTranslation('learner')
  const reduce = useReducedMotion()
  const image = IMAGES[step - 1] ?? IMAGES[0]
  return (
    <div className="qt-grain isolate sticky top-24 grid gap-7 overflow-hidden rounded-xl bg-grad-night p-7 text-white shadow-[var(--qt-shadow-lg)]">
      <CornerPattern side="a" tone="dark" />
      <div
        aria-hidden
        className="absolute -end-24 -bottom-24 -z-10 size-[320px] qt-glow text-rose/25"
      />
      <div className="relative mx-auto w-full max-w-[17rem]">
        <GoldArch className="translate-x-3 -translate-y-3 text-gold/70 rtl:-translate-x-3" />
        <ArchFrame className="aspect-[4/5] overflow-hidden bg-teal">
          <AnimatePresence initial={false}>
            <motion.img
              key={image.src}
              src={image.src}
              alt={t(image.alt)}
              initial={reduce ? false : { opacity: 0, scale: 1.06 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: 0.8, ease: easeOut }}
              className="absolute inset-0 size-full object-cover"
            />
          </AnimatePresence>
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-teal-night/60 via-transparent to-transparent"
          />
        </ArchFrame>
      </div>

      <div className="grid gap-3">
        <p className="font-display font-light text-3xl leading-tight">
          {t('profile.panel.welcome', { name: name.split(' ')[0] })}
        </p>
        <p className="flex gap-2.5 text-sm text-white/85 leading-relaxed">
          <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-gold" />
          {t('profile.panel.privacy')}
        </p>
      </div>

      <div className="grid gap-3 border-white/15 border-t pt-6">
        <p className="font-medium text-gold-soft text-xs uppercase tracking-[0.2em] rtl:tracking-normal">
          {t('profile.onboarding.journeyTitle')}
        </p>
        <ol className="grid gap-3 text-sm">
          {JOURNEY.map((key, index) => {
            const current = index === 0
            return (
              <li key={key} className="flex items-center gap-3">
                <span
                  aria-hidden
                  className={cn(
                    'grid size-7 shrink-0 place-items-center rounded-full text-xs',
                    current ? 'bg-gold text-teal-night' : 'text-white/80 ring-1 ring-white/30',
                  )}
                >
                  {index + 1}
                </span>
                <span className={current ? 'font-medium text-white' : 'text-white/80'}>
                  {t(`profile.onboarding.${key}`)}
                </span>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
