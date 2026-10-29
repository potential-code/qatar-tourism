import { Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { ArchFrame, CornerPattern, GoldArch, Logo } from '@/components/brand'
import { DemoBadge } from '@/components/layout'
import { easeOut } from '@/components/motion'

/**
 * Split layout for every account page. Start side (wide screens): the deep teal ground with
 * the star pattern in two corners and official photography in the pointed arch; the photo cross-fades when
 * the sign-in mode changes. End side: the form on a raised card over a softly patterned ground.
 */
export function AuthShell({
  image,
  alt,
  caption,
  children,
}: {
  image: string
  alt: string
  caption?: ReactNode
  children: ReactNode
}) {
  const reduce = useReducedMotion()
  return (
    <div className="grid min-h-[100dvh] bg-sand lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="qt-grain relative isolate hidden overflow-hidden bg-grad-night text-white lg:sticky lg:top-0 lg:flex lg:h-[100dvh] lg:flex-col lg:justify-between lg:gap-8 lg:p-10">
        <CornerPattern side="a" tone="dark" />
        <div
          aria-hidden
          className="absolute -top-32 -start-32 -z-10 size-[420px] qt-glow text-sky/40"
        />
        <div
          aria-hidden
          className="absolute -end-24 -bottom-24 -z-10 size-[360px] qt-glow text-rose/30"
        />
        <Link to="/" aria-label="Qatar Tourism Academy home" className="relative w-fit">
          <Logo variant="white" withAcademy className="h-10" />
        </Link>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: easeOut }}
          className="relative mx-auto min-h-0 w-full max-w-[22rem] flex-1 xl:max-w-[24rem]"
        >
          <GoldArch className="translate-x-4 -translate-y-4 text-gold/70 rtl:-translate-x-4" />
          <ArchFrame className="size-full overflow-hidden bg-teal shadow-xl">
            <AnimatePresence initial={false}>
              <motion.img
                key={image}
                src={image}
                alt={alt}
                initial={reduce ? false : { opacity: 0, scale: 1.08 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, ease: easeOut }}
                className="absolute inset-0 size-full object-cover"
              />
            </AnimatePresence>
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-teal-deep/70 via-transparent to-transparent"
            />
          </ArchFrame>
          <span className="absolute -start-6 bottom-8 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 font-medium text-white text-xs uppercase tracking-[0.2em] shadow-xl ring-1 ring-white/25 backdrop-blur-xl">
            <span aria-hidden className="size-1.5 rounded-full bg-gold" />
            Service Excellence Academy
          </span>
        </motion.div>

        {caption ? (
          <div className="relative max-w-md border-gold/60 border-s-2 ps-5 text-white">
            {caption}
          </div>
        ) : (
          <span />
        )}
      </aside>

      <main
        id="main"
        className="relative isolate flex flex-col overflow-hidden px-4 py-6 sm:px-8 lg:px-16 lg:py-10"
      >
        <CornerPattern side="b" />
        <div
          aria-hidden
          className="absolute -top-40 -end-40 -z-10 size-[460px] qt-glow text-teal/10"
        />
        <div
          aria-hidden
          className="absolute -bottom-40 -start-40 -z-10 size-[420px] qt-glow text-sky/20"
        />
        <div className="flex items-center justify-between gap-4">
          <Link to="/" aria-label="Qatar Tourism Academy home" className="lg:hidden">
            <Logo withAcademy className="h-9" />
          </Link>
          <Link
            to="/"
            className="group ms-auto inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-ink/70 text-sm shadow-sm ring-1 ring-ink/5 backdrop-blur transition-colors hover:text-teal focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <ChevronLeft
              aria-hidden
              className="size-4 transition-transform group-hover:-translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:translate-x-0.5"
            />
            Back to home
          </Link>
        </div>
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-10">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: easeOut }}
            className="qt-auth-form qt-card-elevated relative flex flex-col gap-7 overflow-hidden rounded-[1.75rem] p-6 shadow-xl sm:p-10"
          >
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal via-sky to-maroon"
            />
            {children}
          </motion.div>
        </div>
        <DemoBadge className="mx-auto w-full max-w-lg" />
      </main>
    </div>
  )
}
