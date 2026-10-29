import { Link } from '@tanstack/react-router'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowDown, Pause, Play } from 'lucide-react'
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'motion/react'
import { type PointerEvent, useEffect, useRef, useState } from 'react'
import { ArchFrame, CornerPattern, Eyebrow, GoldArch } from '@/components/brand'
import { Magnetic } from '@/components/motion'
import { Button } from '@/components/ui/button'
import { HERO, HERO_SLIDES } from '../content/home'
import { scrollToSection } from '../utils/scroll'
import { HeroSlide } from './HeroSlide'

gsap.registerPlugin(ScrollTrigger)

const SLIDE_MS = 7000
const ease = [0.22, 1, 0.36, 1] as const
const ACCENT = 'memorable'

/**
 * Hero (brief §2): headline, body and both buttons verbatim, official photography, pause control.
 * Layers, back to front: slideshow, teal duotone wash, the star pattern in two corners, then the copy and an
 * arch window that previews the next photograph. The arch follows the pointer; as the hero
 * scrolls away the photograph settles closer.
 */
export function Hero() {
  const reduce = useReducedMotion() ?? false
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const section = useRef<HTMLElement>(null)
  const arch = useRef<HTMLDivElement>(null)

  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const archX = useSpring(useTransform(pointerX, [-1, 1], [-18, 18]), {
    stiffness: 80,
    damping: 20,
  })
  const archY = useSpring(useTransform(pointerY, [-1, 1], [-12, 12]), {
    stiffness: 80,
    damping: 20,
  })

  useEffect(() => {
    if (paused || reduce) return
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % HERO_SLIDES.length), SLIDE_MS)
    return () => window.clearInterval(timer)
  }, [paused, reduce])

  useEffect(() => {
    const root = section.current
    if (!root) return
    const media = gsap.matchMedia()
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const scrub = { trigger: root, start: 'top top', end: 'bottom top', scrub: true }
      // Only the arch window moves. The copy stays put (moving it runs the buttons into the slide
      // counter), and the photo stack is not scaled: four full-screen layers transformed on every
      // scroll frame is enough GPU work for Chrome to drop tiles, so content flickers.
      if (arch.current) gsap.to(arch.current, { yPercent: -14, ease: 'none', scrollTrigger: scrub })
    })
    return () => media.revert()
  }, [])

  function track(event: PointerEvent<HTMLElement>) {
    if (reduce || event.pointerType !== 'mouse') return
    const box = event.currentTarget.getBoundingClientRect()
    pointerX.set(((event.clientX - box.left) / box.width) * 2 - 1)
    pointerY.set(((event.clientY - box.top) / box.height) * 2 - 1)
  }

  const current = HERO_SLIDES[index] ?? HERO_SLIDES[0]
  const next = HERO_SLIDES[(index + 1) % HERO_SLIDES.length] ?? HERO_SLIDES[0]
  const words = HERO.headline.split(' ').map((text, position) => ({ text, id: `word-${position}` }))
  return (
    <section
      ref={section}
      aria-labelledby="hero-title"
      onPointerMove={track}
      className="relative isolate flex min-h-[100dvh] overflow-hidden bg-teal-deep"
    >
      <div className="absolute inset-0 -z-30">
        {HERO_SLIDES.map((slide, i) => (
          <HeroSlide
            key={slide.src}
            src={slide.src}
            alt={slide.alt}
            active={i === index}
            paused={paused}
            reduce={reduce}
            direction={i % 2 === 0 ? 1 : -1}
            priority={i === 0}
          />
        ))}
      </div>
      {/* Teal duotone: a start-side brand wash keeps the copy readable over every photo. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20 bg-gradient-to-r from-teal-deep/95 via-teal-deep/60 to-ink/10 rtl:bg-gradient-to-l"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-20 bg-gradient-to-t from-ink/80 via-transparent to-ink/40"
      />
      <CornerPattern side="a" tone="dark" />

      {/* Arch window previewing the next photograph (wide screens only). */}
      <motion.div
        aria-hidden
        style={reduce ? undefined : { x: archX, y: archY }}
        className="absolute end-[6%] top-[18%] hidden h-[62dvh] max-h-[620px] w-[min(26vw,400px)] xl:block"
      >
        <div ref={arch} className="relative size-full">
          <GoldArch className="translate-x-4 -translate-y-4 text-gold/70 rtl:-translate-x-4" />
          <ArchFrame className="size-full overflow-hidden bg-teal shadow-xl">
            <AnimatePresence initial={false}>
              <motion.img
                key={next.src}
                src={next.src}
                alt=""
                initial={reduce ? false : { opacity: 0, scale: 1.12 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.4, ease }}
                className="absolute inset-0 size-full object-cover"
              />
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-teal-deep/70 via-transparent to-transparent" />
          </ArchFrame>
        </div>
      </motion.div>

      <div className="mx-auto flex w-full max-w-[1400px] origin-bottom-left flex-col justify-end px-4 pt-32 pb-32 md:px-8 md:pb-36 rtl:origin-bottom-right">
        <div className="flex max-w-[52rem] flex-col gap-7 xl:max-w-[46rem] 2xl:max-w-[52rem]">
          <motion.div
            initial={reduce ? false : { opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.7, ease }}
          >
            <Eyebrow tone="light">Service Excellence Academy</Eyebrow>
          </motion.div>
          <h1
            id="hero-title"
            className="font-display font-light text-[2.6rem] text-white leading-[1.04] sm:text-5xl lg:text-[4.6rem]"
          >
            {words.map((word, i) => {
              const accent = word.text.toLowerCase().startsWith(ACCENT)
              return (
                <span key={word.id}>
                  <span className="inline-block overflow-hidden pb-2 align-bottom">
                    <motion.span
                      className={
                        accent ? 'inline-block font-normal text-gold-soft italic' : 'inline-block'
                      }
                      initial={reduce ? false : { y: '105%' }}
                      animate={{ y: 0 }}
                      transition={{ delay: 0.25 + i * 0.06, duration: 0.9, ease }}
                    >
                      {word.text}
                    </motion.span>
                  </span>
                  {i < words.length - 1 ? ' ' : null}
                </span>
              )
            })}
          </h1>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 0.7, ease }}
            className="max-w-xl border-gold/60 border-s-2 ps-5 text-lg text-white/90 leading-relaxed md:text-xl"
          >
            {HERO.body}
          </motion.p>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.7, ease }}
            className="flex flex-wrap items-center gap-3"
          >
            <Magnetic>
              <Button
                size="lg"
                onClick={() => scrollToSection('programmes')}
                className="group h-14 bg-white px-8 text-base text-teal-deep hover:bg-sky-mist hover:text-teal-night"
              >
                {HERO.primary}
                <span className="inline-flex size-7 items-center justify-center rounded-full bg-teal text-white transition-transform duration-300 group-hover:translate-y-0.5">
                  <ArrowDown aria-hidden className="size-4" />
                </span>
              </Button>
            </Magnetic>
            <Magnetic strength={0.2}>
              <Button
                asChild
                size="lg"
                variant="glass"
                className="h-14 bg-ink/35 px-8 text-base backdrop-blur-none hover:bg-ink/55"
              >
                <Link to="/register">{HERO.secondary}</Link>
              </Button>
            </Magnetic>
          </motion.div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0">
        <div className="mx-auto flex max-w-[1400px] items-end justify-between gap-6 px-4 pb-6 md:px-8">
          <div className="hidden items-end gap-5 text-white sm:flex">
            <p className="font-display text-3xl leading-none tabular-nums" aria-hidden>
              {String(index + 1).padStart(2, '0')}
              <span className="text-base text-white/50">
                {' '}
                / {String(HERO_SLIDES.length).padStart(2, '0')}
              </span>
            </p>
            <div className="grid gap-2">
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={index}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.4, ease }}
                  className="text-sm text-white/75"
                  aria-hidden
                >
                  {current.alt}
                </motion.p>
              </AnimatePresence>
              <div className="flex items-center gap-1.5" aria-hidden>
                {HERO_SLIDES.map((slide, i) => (
                  <span
                    key={slide.src}
                    className="relative h-[3px] w-10 overflow-hidden rounded-full bg-white/25"
                  >
                    {i < index || (reduce && i === index) ? (
                      <span className="absolute inset-0 bg-white/70" />
                    ) : i === index ? (
                      <span
                        key={`${slide.src}-${index}`}
                        className="absolute inset-0 origin-left bg-gold rtl:origin-right"
                        style={{
                          animation: `qt-fill ${SLIDE_MS}ms linear forwards`,
                          animationPlayState: paused ? 'paused' : 'running',
                        }}
                      />
                    ) : null}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {reduce ? null : (
            <div
              aria-hidden
              className="pointer-events-none absolute start-1/2 bottom-6 hidden -translate-x-1/2 flex-col items-center gap-2 text-[0.65rem] text-white/70 uppercase tracking-[0.3em] md:flex rtl:translate-x-1/2"
            >
              Scroll
              <span className="relative h-10 w-px overflow-hidden bg-white/20">
                <span
                  className="absolute inset-x-0 top-0 h-1/2 bg-gold"
                  style={{ animation: 'qt-scroll-cue 1.8s cubic-bezier(0.65,0,0.35,1) infinite' }}
                />
              </span>
            </div>
          )}

          {reduce ? null : (
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-pressed={paused}
              className="ms-auto inline-flex items-center gap-2 rounded-full border border-white/35 bg-ink/55 px-3.5 py-1.5 text-white text-xs transition-colors hover:bg-ink/70 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/60"
            >
              {paused ? (
                <Play aria-hidden className="size-3.5" />
              ) : (
                <Pause aria-hidden className="size-3.5" />
              )}
              {paused ? 'Play background motion' : 'Pause background motion'}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
