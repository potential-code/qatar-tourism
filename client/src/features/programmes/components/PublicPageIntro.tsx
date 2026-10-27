import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { PhotoPanel } from '@/components/brand'
import { easeOut } from '@/components/motion/variants'

interface PublicPageIntroProps {
  title: string
  image: string
  alt: string
  children?: ReactNode
}

/**
 * Photo banner that opens public list pages: serif title over an official photograph, the
 * site's swoop-in clip on load and a quiet settle. Render inside `PublicLayout overlayHeader`.
 */
export function PublicPageIntro({ title, image, alt, children }: PublicPageIntroProps) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? false : { clipPath: 'inset(0 0 22% 0 round 0 0 48px 48px)' }}
      animate={{ clipPath: 'inset(0 0 0% 0 round 0 0 48px 48px)' }}
      transition={{ duration: 1.1, ease: easeOut }}
    >
      <PhotoPanel src={image} alt={alt} fade="start" priority className="bg-ink">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/55 to-transparent"
        />
        <div className="mx-auto flex min-h-[46dvh] max-w-[1400px] flex-col justify-end gap-4 px-4 pt-32 pb-12 md:min-h-[52dvh] md:px-8 md:pb-16">
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: easeOut }}
            className="max-w-3xl font-display font-light text-4xl text-white leading-[1.06] md:text-6xl"
          >
            {title}
          </motion.h1>
          {children ? (
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3, ease: easeOut }}
              className="max-w-2xl text-lg text-white/85 leading-relaxed"
            >
              {children}
            </motion.p>
          ) : null}
        </div>
      </PhotoPanel>
    </motion.div>
  )
}
