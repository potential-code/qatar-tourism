import { Link } from '@tanstack/react-router'
import { ArrowDown, Pause, Play } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { HERO, HERO_SLIDES } from '../content/home'
import { scrollToSection } from '../utils/scroll'
import { HeroSlide } from './HeroSlide'

const SLIDE_MS = 7000
const ease = [0.22, 1, 0.36, 1] as const

/** Hero (brief §2): headline, body and both buttons verbatim, official photography, pause control. */
export function Hero() {
  const reduce = useReducedMotion() ?? false
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused || reduce) return
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % HERO_SLIDES.length), SLIDE_MS)
    return () => window.clearInterval(timer)
  }, [paused, reduce])

  const words = HERO.headline.split(' ').map((text, position) => ({ text, id: `word-${position}` }))
  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[100dvh] overflow-hidden bg-ink"
    >
      <div className="absolute inset-0 -z-20">
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
      {/* Readable contrast over every photo: a start-side wash plus a floor gradient. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-r from-ink/80 via-ink/40 to-ink/5 rtl:bg-gradient-to-l"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/70 via-transparent to-ink/30"
      />

      <div className="mx-auto flex w-full max-w-[1400px] flex-col justify-end px-4 pt-28 pb-24 md:px-8 md:pb-28">
        <div className="flex max-w-[62rem] flex-col gap-7">
          <h1
            id="hero-title"
            className="font-display font-light text-[2.6rem] text-white leading-[1.06] sm:text-5xl lg:text-[4.25rem]"
          >
            {words.map((word, i) => (
              <span key={word.id} className="inline-block overflow-hidden pb-1 align-bottom">
                <motion.span
                  className="inline-block"
                  initial={reduce ? false : { y: '105%' }}
                  animate={{ y: 0 }}
                  transition={{ delay: 0.25 + i * 0.06, duration: 0.9, ease }}
                >
                  {word.text}
                  {i < words.length - 1 ? ' ' : ''}
                </motion.span>
              </span>
            ))}
          </h1>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 0.7, ease }}
            className="max-w-xl text-lg text-white/85 leading-relaxed md:text-xl"
          >
            {HERO.body}
          </motion.p>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.7, ease }}
            className="flex flex-wrap gap-3"
          >
            <Button size="lg" onClick={() => scrollToSection('programmes')} className="group">
              {HERO.primary}
              <ArrowDown aria-hidden className="transition-transform group-hover:translate-y-0.5" />
            </Button>
            <Button asChild size="lg" variant="glass">
              <Link to="/register">{HERO.secondary}</Link>
            </Button>
          </motion.div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0">
        <div className="mx-auto flex max-w-[1400px] items-center justify-end gap-4 px-4 pb-6 md:px-8">
          <div className="flex items-center gap-1.5" aria-hidden>
            {HERO_SLIDES.map((slide, i) => (
              <span
                key={slide.src}
                className={`h-0.5 rounded-full transition-all duration-500 ${i === index ? 'w-8 bg-white' : 'w-4 bg-white/40'}`}
              />
            ))}
          </div>
          {reduce ? null : (
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-pressed={paused}
              className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-ink/30 px-3.5 py-1.5 text-white text-xs backdrop-blur-md transition-colors hover:bg-ink/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/60"
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
