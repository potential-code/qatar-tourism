/** Scrolls to a homepage section, respecting reduced motion. Focus moves for keyboard users. */
export function scrollToSection(id: string) {
  const target = document.getElementById(id)
  if (!target) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  target.focus({ preventScroll: true })
  history.replaceState(null, '', `#${id}`)
}
