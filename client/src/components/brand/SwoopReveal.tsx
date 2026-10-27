import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useReducedMotion } from 'motion/react'
import { type ReactNode, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

gsap.registerPlugin(ScrollTrigger)

/**
 * The site's "swoop-in" reveal: an image opens from a horizontal band in the middle
 * to full frame as it scrolls into view, with a slow settle-in zoom.
 */
export function SwoopReveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    if (reduce || !ref.current) return
    const el = ref.current
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { clipPath: 'inset(38% 6% 38% 6% round 12px)' },
        {
          clipPath: 'inset(0% 0% 0% 0% round 12px)',
          ease: 'power3.out',
          duration: 1.2,
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        },
      )
      const media = el.querySelector('img, video')
      if (media) {
        gsap.fromTo(
          media,
          { scale: 1.15 },
          {
            scale: 1,
            duration: 1.6,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 85%', once: true },
          },
        )
      }
    }, el)
    return () => ctx.revert()
  }, [reduce])

  return (
    <div ref={ref} className={cn('overflow-hidden rounded-xl', className)}>
      {children}
    </div>
  )
}
