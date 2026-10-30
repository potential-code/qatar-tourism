import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ArchFrame, CornerPattern, Eyebrow, GoldArch } from '@/components/brand'
import { ScrollReveal } from '@/components/motion'
import { cn } from '@/lib/utils'
import { PROGRAMME_REQUIREMENTS, STEPS } from '../content/home'
import { useDocumentDir } from '../hooks/useDocumentDir'
import { tr } from '../utils/translate'

gsap.registerPlugin(ScrollTrigger)

/** A colour per step, so the sequence reads as a playful run rather than four clones. */
const STEP_TONE = [
  { bar: 'bg-grad-teal', label: 'text-teal', arch: 'text-sky' },
  { bar: 'bg-grad-maroon', label: 'text-maroon', arch: 'text-rose' },
  { bar: 'bg-sky', label: 'text-teal-deep', arch: 'text-gold' },
  { bar: 'bg-gold', label: 'text-teal-deep', arch: 'text-gold-soft' },
] as const

const CODE_TONE: Record<string, string> = {
  A: 'bg-grad-maroon text-white',
  B: 'bg-sky text-teal-night',
  C: 'bg-gold text-teal-night',
}

/**
 * "How it works" (brief §2): the four steps as the page's one pinned storytelling moment, on the
 * deep teal ground with the star lattice. On wide screens with motion allowed, the section
 * pins and the steps pan sideways as you scroll (one track width only, so it never traps the
 * reader); a gold rail fills and lights each step's node, and the big numerals drift at their own
 * pace. Narrow screens and reduced motion get a vertical timeline.
 *
 * RTL decision (Arabic): the sideways pan is left-to-right only. A pinned horizontal track that
 * scrubs from its start to its end would need every offset, the rail fill and the per-step
 * parallax mirrored, and a mistake leaves readers scrolling away from the content. In Arabic the
 * section therefore uses the same vertical timeline as narrow screens (every pinned-only class is
 * gated with `ltr:`, and the GSAP setup is skipped), which reads naturally right-to-left.
 */
export function HowItWorks() {
  const wrap = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const rail = useRef<HTMLDivElement>(null)
  const { t } = useTranslation('public')
  const dir = useDocumentDir()

  useEffect(() => {
    const section = wrap.current
    const strip = track.current
    if (!section || !strip || dir === 'rtl') return
    const media = gsap.matchMedia()
    media.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
      const distance = () => strip.scrollWidth - window.innerWidth
      const nodes = gsap.utils.toArray<HTMLElement>('[data-node]', rail.current ?? undefined)
      const pan = gsap.to(strip, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const lit = Math.floor(self.progress * nodes.length + 0.15)
            nodes.forEach((node, i) => {
              node.dataset.on = String(i < lit)
            })
          },
        },
      })
      const fill = rail.current?.querySelector('[data-fill]')
      if (fill) {
        gsap.fromTo(
          fill,
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: section,
              start: 'top top',
              end: () => `+=${distance()}`,
              scrub: 0.8,
              invalidateOnRefresh: true,
            },
          },
        )
      }
      gsap.utils.toArray<HTMLElement>('[data-step]', strip).forEach((panel, index) => {
        const frame = panel.querySelector('[data-frame]')
        const card = panel.querySelector('[data-caption]')
        const enter = {
          trigger: panel,
          containerAnimation: pan,
          start: 'left 100%',
          end: 'left 45%',
          scrub: true,
        }
        if (frame) {
          gsap.fromTo(
            frame,
            { y: index % 2 ? -140 : 140, rotate: index % 2 ? -8 : 8, scale: 0.8, autoAlpha: 0.2 },
            {
              y: 0,
              rotate: 0,
              scale: 1,
              autoAlpha: 1,
              ease: 'back.out(1.4)',
              scrollTrigger: enter,
            },
          )
        }
        if (card) {
          gsap.fromTo(
            card,
            { y: 120, autoAlpha: 0, rotateX: -35, transformPerspective: 900 },
            {
              y: 0,
              autoAlpha: 1,
              rotateX: 0,
              ease: 'power3.out',
              scrollTrigger: { ...enter, start: 'left 85%', end: 'left 35%' },
            },
          )
        }
      })
      for (const panel of gsap.utils.toArray<HTMLElement>('[data-step]', strip)) {
        const image = panel.querySelector('img')
        const numeral = panel.querySelector('[data-numeral]')
        const scrub = {
          trigger: panel,
          containerAnimation: pan,
          start: 'left right',
          end: 'right left',
          scrub: true,
        }
        if (image) {
          gsap.fromTo(
            image,
            { scale: 1.22, xPercent: -6 },
            { scale: 1.02, xPercent: 6, ease: 'none', scrollTrigger: scrub },
          )
        }
        if (numeral)
          gsap.fromTo(
            numeral,
            { xPercent: 40 },
            { xPercent: -40, ease: 'none', scrollTrigger: scrub },
          )
      }
      ScrollTrigger.refresh()
    })
    return () => media.revert()
  }, [dir])

  return (
    <section
      id="how-it-works"
      tabIndex={-1}
      aria-labelledby="how-title"
      className="qt-grain relative isolate scroll-mt-20 overflow-hidden bg-grad-teal text-white outline-none"
    >
      <CornerPattern side="b" tone="dark" />
      <div
        aria-hidden
        className="absolute -top-40 start-1/3 -z-10 size-[640px] qt-glow text-sky/30"
      />
      <div
        aria-hidden
        className="absolute -bottom-40 -end-20 -z-10 size-[520px] qt-glow text-rose/25"
      />
      <ScrollReveal query="(prefers-reduced-motion: no-preference) and (max-width: 1023px)">
        <div
          ref={wrap}
          className="relative lg:motion-safe:ltr:flex lg:motion-safe:ltr:min-h-[100dvh] lg:motion-safe:ltr:items-center"
        >
          <div
            ref={track}
            className="mx-auto flex max-w-[1400px] flex-col gap-16 px-4 py-24 md:px-8 lg:py-32 lg:motion-safe:ltr:mx-0 lg:motion-safe:ltr:w-max lg:motion-safe:ltr:max-w-none lg:motion-safe:ltr:flex-row lg:motion-safe:ltr:items-center lg:motion-safe:ltr:gap-16 lg:motion-safe:ltr:py-0 lg:motion-safe:ltr:ps-[max(2rem,calc((100vw-1400px)/2+2rem))] lg:motion-safe:ltr:pe-[8vw]"
          >
            <div className="flex max-w-md shrink-0 flex-col justify-center gap-6 lg:motion-safe:ltr:w-[30rem]">
              <Eyebrow className="rtl:tracking-normal" index="03" tone="light">
                {t('steps.eyebrow')}
              </Eyebrow>
              <h2
                id="how-title"
                className="font-display font-light text-5xl leading-[1.04] rtl:leading-[1.4] md:text-7xl"
              >
                {t('steps.titleLead')}{' '}
                <em className="text-gold-soft rtl:not-italic">{t('steps.titleAccent')}</em>
              </h2>
              <p className="text-lg text-white/80 leading-relaxed">{t('steps.intro')}</p>
            </div>
            <ol className="relative grid gap-14 border-white/15 border-s ps-8 md:grid-cols-2 md:border-none md:ps-0 lg:motion-safe:ltr:flex lg:motion-safe:ltr:gap-16">
              {STEPS.map((step, index) => (
                <li
                  key={step.key}
                  data-step
                  data-reveal="card"
                  className={cn(
                    'relative grid shrink-0 content-start gap-0 lg:motion-safe:ltr:w-[25rem]',
                    index % 2 === 1 && 'lg:motion-safe:ltr:translate-y-10',
                  )}
                >
                  <span
                    aria-hidden
                    className="absolute -start-[2.55rem] top-2 size-4 rounded-full bg-gold ring-4 ring-teal-deep md:hidden"
                  />
                  <span
                    data-numeral
                    aria-hidden
                    className="pointer-events-none absolute -top-16 -end-2 z-0 select-none font-display font-light text-[9rem] text-transparent leading-none [-webkit-text-stroke:1px_rgb(231_211_171/0.45)] lg:text-[12rem]"
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div data-frame className="relative z-10 mx-4">
                    <GoldArch
                      className={cn(
                        'translate-x-3 -translate-y-3 rtl:-translate-x-3',
                        STEP_TONE[index % STEP_TONE.length]?.arch,
                      )}
                    />
                    <ArchFrame className="aspect-[4/5] overflow-hidden bg-teal shadow-xl lg:motion-safe:ltr:aspect-auto lg:motion-safe:ltr:h-[min(50dvh,480px)]">
                      <img
                        src={step.image}
                        alt={t(`steps.${step.key}.alt`)}
                        loading="lazy"
                        className="size-full object-cover"
                      />
                    </ArchFrame>
                  </div>
                  <div
                    data-caption
                    className="qt-card-elevated relative z-20 -mt-16 grid gap-2 overflow-hidden rounded-2xl p-6 text-ink"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'absolute inset-x-0 top-0 h-1.5',
                        STEP_TONE[index % STEP_TONE.length]?.bar,
                      )}
                    />
                    <p
                      className={cn(
                        'font-medium text-xs uppercase tracking-[0.2em] rtl:tracking-normal',
                        STEP_TONE[index % STEP_TONE.length]?.label,
                      )}
                    >
                      {t('steps.step', { n: index + 1 })}
                    </p>
                    <h3 className="font-display text-2xl leading-tight md:text-[1.65rem]">
                      {t(`steps.${step.key}.title`)}
                    </h3>
                    <p className="text-ink/75 text-sm leading-relaxed">
                      {t(`steps.${step.key}.body`)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <aside
              aria-label={t('requirements.aria')}
              data-reveal="card"
              className="grid shrink-0 content-center gap-5 lg:motion-safe:ltr:w-[28rem]"
            >
              <p className="font-display text-3xl rtl:leading-[1.4]">{t('requirements.title')}</p>
              <dl className="grid gap-3">
                {PROGRAMME_REQUIREMENTS.map((row) => (
                  <div
                    key={row.code}
                    className="flex gap-4 rounded-2xl bg-white/[0.07] p-5 shadow-lg ring-1 ring-white/15 backdrop-blur-md transition-colors duration-300 hover:bg-white/[0.12]"
                  >
                    <dt
                      className={cn(
                        'inline-flex size-11 shrink-0 items-center justify-center rounded-xl font-display text-xl shadow-md',
                        CODE_TONE[row.code],
                      )}
                    >
                      <span className="sr-only">{t('requirements.program')} </span>
                      {tr(t, `programme.letter.${row.code}`)}
                    </dt>
                    <dd className="text-sm text-white/85 leading-relaxed">
                      {t(`requirements.${row.key}`)}
                    </dd>
                  </div>
                ))}
              </dl>
            </aside>
          </div>

          {/* Progress rail for the pinned pan (wide screens, motion allowed). */}
          <div
            ref={rail}
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-10 hidden lg:motion-safe:ltr:block"
          >
            <div className="relative mx-auto flex max-w-[1100px] items-center justify-between px-8">
              <span className="absolute inset-x-8 top-1/2 h-px -translate-y-1/2 bg-white/20" />
              <span
                data-fill
                className="absolute inset-x-8 top-1/2 h-px origin-left -translate-y-1/2 bg-gold rtl:origin-right"
              />
              {STEPS.map((step, index) => (
                <span
                  key={step.key}
                  data-node
                  data-on="false"
                  className="relative flex size-9 items-center justify-center rounded-full bg-teal-deep font-display text-sm text-white/60 ring-1 ring-white/25 transition-all duration-500 data-[on=true]:scale-110 data-[on=true]:bg-gold data-[on=true]:text-teal-deep data-[on=true]:ring-gold-soft data-[on=true]:shadow-[0_0_24px_rgb(200_164_106/0.6)]"
                >
                  {index + 1}
                </span>
              ))}
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  )
}
