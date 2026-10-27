import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { useReducedMotion } from 'motion/react'
import { type ReactNode, useEffect } from 'react'

gsap.registerPlugin(ScrollTrigger)

/**
 * Smooth scrolling for the public site only (portals keep native scroll so dashboards stay fast).
 * Lenis drives GSAP's ticker so ScrollTrigger stays in sync. Disabled under reduced motion.
 */
export function LenisProvider({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion()

  useEffect(() => {
    if (reduce) return
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true })
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
    }
  }, [reduce])

  return <>{children}</>
}
