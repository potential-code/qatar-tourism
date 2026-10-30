import type { ProgrammeCode } from '@shared/constants'
import { Link } from '@tanstack/react-router'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ChevronLeft } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { type ReactNode, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { CornerPattern } from '@/components/brand'
import { easeOut, SplitWords } from '@/components/motion'
import { cn } from '@/lib/utils'
import { PROGRAMME_TONE } from '../tone'
import { programmeLetter } from '../utils/copy'

gsap.registerPlugin(ScrollTrigger)

/**
 * Photo hero for public inner pages: back link, eyebrow, title and actions over the photograph.
 * A programme page passes `programme` to wash the photo in that programme's colour and set its
 * letter as a watermark. The photo drifts slower than the page as it scrolls away.
 */
export function PageHero({
  image,
  alt,
  back,
  eyebrow,
  title,
  programme,
  children,
}: {
  image: string
  alt: string
  back: { label: string; to: string }
  eyebrow?: ReactNode
  title: ReactNode
  programme?: ProgrammeCode
  children?: ReactNode
}) {
  const reduce = useReducedMotion()
  const { t, i18n } = useTranslation('public')
  const photo = useRef<HTMLImageElement>(null)
  const tone = programme ? PROGRAMME_TONE[programme] : null

  useEffect(() => {
    const el = photo.current
    if (!el) return
    const media = gsap.matchMedia()
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(
        el,
        { yPercent: 0, scale: 1.08 },
        {
          yPercent: 12,
          scale: 1.14,
          ease: 'none',
          scrollTrigger: {
            trigger: el.parentElement,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          },
        },
      )
    })
    return () => media.revert()
  }, [])

  return (
    <section className="relative isolate min-h-[82dvh] overflow-hidden bg-ink text-white">
      <img
        ref={photo}
        src={image}
        alt={alt}
        fetchPriority="high"
        className="absolute inset-0 -z-30 size-full origin-top object-cover"
      />
      <div
        aria-hidden
        className={cn(
          'absolute inset-0 -z-20 bg-gradient-to-r rtl:bg-gradient-to-l',
          tone?.heroWash ?? 'from-ink/85 via-ink/45 to-transparent',
        )}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-20 bg-gradient-to-t from-ink/70 via-transparent to-ink/40"
      />
      <CornerPattern side="a" tone="dark" />
      {programme ? (
        <span
          aria-hidden
          className="pointer-events-none absolute end-[4%] -bottom-[6%] -z-10 select-none font-display font-light text-[clamp(14rem,32vw,30rem)] text-white/[0.09] leading-none"
        >
          {programmeLetter(t, programme)}
        </span>
      ) : null}
      <div className="mx-auto flex min-h-[82dvh] max-w-[1400px] flex-col justify-end gap-8 px-4 pt-36 pb-40 md:px-8 md:pb-48">
        <Link
          to={back.to as never}
          className="group inline-flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-sm text-white/90 ring-1 ring-white/20 backdrop-blur-md transition-colors hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/60"
        >
          <ChevronLeft
            aria-hidden
            className="size-4 transition-transform group-hover:-translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:translate-x-0.5"
          />
          {back.label}
        </Link>
        <div className="flex max-w-3xl flex-col gap-6">
          {eyebrow ? (
            <motion.div
              initial={reduce ? false : { opacity: 0, x: i18n.dir() === 'rtl' ? 16 : -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: easeOut }}
            >
              {eyebrow}
            </motion.div>
          ) : null}
          <h1 className="font-display font-light text-4xl leading-[1.04] rtl:leading-[1.4] md:text-7xl">
            {typeof title === 'string' ? (
              <SplitWords text={title} onView={false} delay={0.15} />
            ) : (
              title
            )}
          </h1>
          {children ? (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.55, ease: easeOut }}
              className="flex flex-col gap-5"
            >
              {children}
            </motion.div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
