import { Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { PhotoPanel } from '@/components/brand'

/** Photo hero for public inner pages, with a back link and the page title over the image. */
export function PageHero({
  image,
  alt,
  back,
  eyebrow,
  title,
  children,
}: {
  image: string
  alt: string
  back: { label: string; to: string }
  eyebrow?: ReactNode
  title: ReactNode
  children?: ReactNode
}) {
  const reduce = useReducedMotion()
  return (
    <PhotoPanel src={image} alt={alt} fade="start" priority className="min-h-[72dvh] bg-ink">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/60 to-transparent"
      />
      <div className="mx-auto flex min-h-[72dvh] max-w-[1400px] flex-col justify-end gap-8 px-4 pt-28 pb-14 md:px-8 md:pb-20">
        <Link
          to={back.to as never}
          className="inline-flex w-fit items-center gap-1 rounded-full text-sm text-white/80 hover:text-white focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/60"
        >
          <ChevronLeft aria-hidden className="size-4 rtl:-scale-x-100" />
          {back.label}
        </Link>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="flex max-w-3xl flex-col gap-5"
        >
          {eyebrow}
          <h1 className="font-display font-light text-4xl text-white leading-[1.06] md:text-6xl">
            {title}
          </h1>
          {children}
        </motion.div>
      </div>
    </PhotoPanel>
  )
}
