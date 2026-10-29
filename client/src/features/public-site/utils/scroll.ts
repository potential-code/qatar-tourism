import { getLenis } from '@/components/motion'

/** Scrolls to a homepage section, respecting reduced motion. Focus moves for keyboard users. */
export function scrollToSection(id: string) {
  const target = document.getElementById(id)
  if (!target) return
  const lenis = getLenis()
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (lenis && !reduce) {
    lenis.scrollTo(target, { offset: -16, duration: 1.4 })
  } else {
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }
  target.focus({ preventScroll: true })
  history.replaceState(null, '', `#${id}`)
}
