import { Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { Logo } from '@/components/brand'
import { DemoBadge } from '@/components/layout'

/**
 * Split layout for every account page: official photography on the start side (wide screens),
 * the form on the end side. The photo cross-fades when the sign-in mode changes.
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
      <aside className="relative isolate hidden overflow-hidden bg-ink lg:sticky lg:top-0 lg:block lg:h-[100dvh]">
        <AnimatePresence initial={false}>
          <motion.img
            key={image}
            src={image}
            alt={alt}
            initial={reduce ? false : { opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 -z-20 size-full object-cover"
          />
        </AnimatePresence>
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/80 via-ink/20 to-ink/40"
        />
        <div className="flex h-full flex-col justify-between p-10">
          <Link to="/" aria-label="Qatar Tourism Academy home" className="w-fit">
            <Logo variant="white" withAcademy className="h-10" />
          </Link>
          {caption ? <div className="max-w-md text-white">{caption}</div> : null}
        </div>
      </aside>
      <main id="main" className="flex flex-col px-4 py-6 sm:px-8 lg:px-16 lg:py-10">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" aria-label="Qatar Tourism Academy home" className="lg:hidden">
            <Logo withAcademy className="h-9" />
          </Link>
          <Link
            to="/"
            className="ms-auto inline-flex items-center gap-1 rounded-full text-muted-foreground text-sm hover:text-teal focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <ChevronLeft aria-hidden className="size-4 rtl:-scale-x-100" />
            Back to home
          </Link>
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 py-10">
          {children}
        </div>
        <DemoBadge className="mx-auto w-full max-w-md" />
      </main>
    </div>
  )
}
