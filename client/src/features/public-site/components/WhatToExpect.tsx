import { ArrowUpRight } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CornerPattern, Eyebrow, SectionHeading, StarPattern } from '@/components/brand'
import { CountUp, easeOut, ScrollReveal, SplitWords, TiltCard } from '@/components/motion'
import { cn } from '@/lib/utils'
import { BENEFITS, type BenefitKey } from '../content/home'
import { BenefitPreviewDialog } from './BenefitPreviewDialog'

const LAYOUT: Record<BenefitKey, string> = {
  pace: 'lg:col-span-7 min-h-[380px] lg:min-h-[460px]',
  ai: 'lg:col-span-5 min-h-[380px] lg:min-h-[460px]',
  trainers: 'lg:col-span-5 min-h-[360px]',
  progress: 'lg:col-span-7 min-h-[360px]',
}

/** Icon colour per tile: one accent each, so the four read as a set. */
const ICON: Record<BenefitKey, string> = {
  pace: 'text-gold-soft',
  ai: 'text-rose-mist',
  trainers: 'text-sky',
  progress: 'text-teal',
}

const TONE: Record<BenefitKey, string> = {
  pace: 'bg-teal-deep text-white',
  ai: 'bg-grad-maroon text-white',
  trainers: 'bg-ink text-white',
  progress: 'qt-card-elevated text-ink',
}

/** Photograph tiles: slow zoom on hover, teal or ink wash for legible copy. */
function PhotoBackdrop({ image, tone }: { image: string; tone: 'teal' | 'ink' }) {
  return (
    <>
      <img
        src={image}
        alt=""
        loading="lazy"
        className="absolute inset-0 -z-20 size-full object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.07]"
      />
      <div
        aria-hidden
        className={cn(
          'absolute inset-0 -z-10 bg-gradient-to-t',
          tone === 'teal'
            ? 'from-teal-deep via-teal-deep/55 to-teal-deep/5'
            : 'from-ink/90 via-ink/40 to-ink/5',
        )}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-32 bg-gradient-to-b from-ink/45 to-transparent"
      />
    </>
  )
}

/** AI tile: the visitor's line arrives as a chat bubble, then the reply starts typing. */
function ChatPreview() {
  const reduce = useReducedMotion()
  const { t } = useTranslation('public')
  const show = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 14, scale: 0.96 },
    whileInView: { opacity: 1, y: 0, scale: 1 },
    viewport: { once: true, amount: 0.6 },
    transition: { delay, duration: 0.6, ease: easeOut },
  })
  return (
    <div aria-hidden className="grid gap-3">
      <motion.p
        {...show(0.2)}
        className="max-w-[92%] rounded-2xl rounded-ss-sm bg-white/95 px-5 py-4 font-display text-ink text-lg leading-snug shadow-lg md:text-xl"
      >
        {t('expect.chat')}
      </motion.p>
      <motion.div
        {...show(0.9)}
        className="ms-auto flex w-fit items-center gap-1.5 rounded-2xl rounded-se-sm bg-white/15 px-4 py-3 ring-1 ring-white/25 backdrop-blur-md"
      >
        {[0, 1, 2].map((dot) => (
          <motion.span
            key={dot}
            className="size-2 rounded-full bg-white"
            animate={reduce ? undefined : { opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
            transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY, delay: dot * 0.18 }}
          />
        ))}
      </motion.div>
    </div>
  )
}

/** Progress tile: the score ring beside baseline and post bars that grow in. Decorative. */
function ProgressPreview() {
  const reduce = useReducedMotion()
  const { t } = useTranslation('public')
  const radius = 44
  const circumference = 2 * Math.PI * radius
  const grow = (to: string, delay: number) => ({
    initial: reduce ? false : { width: '0%' },
    whileInView: { width: to },
    viewport: { once: true, amount: 0.6 },
    transition: { duration: 1.4, ease: easeOut, delay },
  })
  return (
    <div className="grid items-center gap-6 sm:grid-cols-[auto_1fr] md:gap-10" aria-hidden>
      <div className="relative size-36 shrink-0">
        <svg viewBox="0 0 100 100" aria-hidden="true" className="size-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="var(--qt-sky-mist)"
            strokeWidth="9"
          />
          <motion.circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="url(#qt-progress-grad)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={reduce ? false : { strokeDashoffset: circumference }}
            whileInView={{ strokeDashoffset: circumference * 0.2 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 1.6, ease: easeOut, delay: 0.2 }}
          />
          <defs>
            <linearGradient id="qt-progress-grad" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--qt-teal)" />
              <stop offset="100%" stopColor="var(--qt-sky)" />
            </linearGradient>
          </defs>
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-4xl text-ink leading-none">
            <CountUp value={80} duration={1.6} />
          </span>
          <span className="mt-1 text-[0.65rem] text-muted-foreground uppercase tracking-[0.18em] rtl:tracking-normal">
            {t('expect.postScore')}
          </span>
        </span>
      </div>
      <div className="grid gap-4 rounded-2xl bg-gradient-to-br from-sky-mist via-teal-mist/60 to-white p-5 ring-1 ring-teal/10 md:p-6">
        <div className="grid gap-2">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">{t('expect.baseline')}</span>
            <span className="font-display text-2xl text-ink/55">
              <CountUp value={40} />
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white">
            <motion.div {...grow('40%', 0.2)} className="h-full rounded-full bg-teal-soft" />
          </div>
        </div>
        <div className="grid gap-2">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">{t('expect.postAssessment')}</span>
            <span className="font-display text-2xl text-teal">
              <CountUp value={80} duration={1.6} />
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white">
            <motion.div
              {...grow('80%', 0.45)}
              className="h-full rounded-full bg-gradient-to-r from-teal to-sky rtl:bg-gradient-to-l"
            />
          </div>
        </div>
        <span className="w-fit rounded-full bg-rose-mist px-3 py-1 font-medium text-maroon text-sm">
          {t('expect.points')}
        </span>
      </div>
    </div>
  )
}

/** "What to expect" (brief §2): four benefits, each opening its preview. */
export function WhatToExpect() {
  const { t } = useTranslation('public')
  const [open, setOpen] = useState<BenefitKey | null>(null)
  return (
    <section
      id="academy"
      tabIndex={-1}
      aria-labelledby="expect-title"
      className="relative isolate scroll-mt-20 overflow-hidden bg-grad-night text-white outline-none"
    >
      <CornerPattern side="a" tone="dark" />
      <div
        aria-hidden
        className="absolute -top-32 start-1/4 -z-10 size-[520px] qt-glow text-sky/25"
      />
      <div
        aria-hidden
        className="absolute -bottom-40 end-10 -z-10 size-[460px] qt-glow text-rose/20"
      />
      <ScrollReveal className="mx-auto flex max-w-[1400px] flex-col gap-14 px-4 py-24 md:px-8 md:py-32">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <SectionHeading
            tone="light"
            eyebrow={
              <Eyebrow className="rtl:tracking-normal" index="02" tone="light">
                {t('expect.eyebrow')}
              </Eyebrow>
            }
            title={
              <span id="expect-title" className="rtl:leading-[1.4]">
                <SplitWords text={t('expect.title')} />
              </span>
            }
            description={t('expect.description')}
          />
          <ul aria-hidden data-reveal className="flex flex-wrap gap-2 lg:justify-end">
            {BENEFITS.map((benefit) => {
              const Icon = benefit.icon
              return (
                <li
                  key={benefit.key}
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/90 ring-1 ring-white/15 backdrop-blur"
                >
                  <Icon
                    className={cn(
                      'size-4',
                      benefit.key === 'progress' ? 'text-sky' : ICON[benefit.key],
                    )}
                  />
                  {t(`benefits.${benefit.key}.title`)}
                </li>
              )
            })}
          </ul>
        </div>
        <div className="grid gap-6 lg:grid-cols-12">
          {BENEFITS.map((benefit) => {
            const Icon = benefit.icon
            const light = benefit.key === 'progress'
            return (
              <div key={benefit.key} data-reveal="card" className={LAYOUT[benefit.key]}>
                <TiltCard max={4} className="size-full rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setOpen(benefit.key)}
                    aria-haspopup="dialog"
                    className={cn(
                      'group relative isolate flex size-full flex-col justify-between gap-10 overflow-hidden rounded-2xl p-7 text-start shadow-[0_30px_60px_-24px_rgb(0_0_0/0.55)] ring-1 ring-white/10 transition-shadow duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-xl focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring md:p-9',
                      TONE[benefit.key],
                    )}
                  >
                    {benefit.image ? (
                      <PhotoBackdrop
                        image={benefit.image}
                        tone={benefit.key === 'pace' ? 'teal' : 'ink'}
                      />
                    ) : null}
                    {benefit.key === 'ai' ? (
                      <div aria-hidden className="absolute inset-0 -z-10 text-white/[0.07]">
                        <StarPattern size={52} />
                      </div>
                    ) : null}
                    <div
                      aria-hidden
                      className={cn(
                        'pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100',
                        light ? 'qt-spotlight-ink' : 'qt-spotlight',
                      )}
                    />
                    <div className="flex items-start justify-between gap-4">
                      <Icon
                        aria-hidden
                        className={cn(
                          'size-9 drop-shadow-md transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-1 group-hover:scale-110',
                          ICON[benefit.key],
                        )}
                        strokeWidth={1.6}
                      />
                      <span
                        className={cn(
                          'inline-flex items-center gap-2 rounded-full py-1 ps-4 pe-1 font-medium text-sm shadow-md transition-colors duration-300',
                          light
                            ? 'bg-teal-mist text-teal-deep'
                            : 'bg-white text-ink group-hover:bg-gold-soft',
                        )}
                      >
                        {t('expect.preview')}
                        <span
                          className={cn(
                            'inline-flex size-8 items-center justify-center rounded-full transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5',
                            light ? 'bg-teal text-white' : 'bg-teal text-white',
                          )}
                        >
                          <ArrowUpRight aria-hidden className="size-4 rtl:-scale-x-100" />
                        </span>
                      </span>
                    </div>
                    {benefit.key === 'ai' ? <ChatPreview /> : null}
                    {benefit.key === 'progress' ? <ProgressPreview /> : null}
                    <div className="grid max-w-md gap-2">
                      <h3 className="font-display text-2xl md:text-3xl">
                        {t(`benefits.${benefit.key}.title`)}
                      </h3>
                      <p
                        className={cn(
                          'text-base leading-relaxed',
                          light ? 'text-muted-foreground' : 'text-white/85',
                        )}
                      >
                        {t(`benefits.${benefit.key}.body`)}
                      </p>
                    </div>
                  </button>
                </TiltCard>
              </div>
            )
          })}
        </div>
      </ScrollReveal>
      <BenefitPreviewDialog benefit={open} onClose={() => setOpen(null)} />
    </section>
  )
}
