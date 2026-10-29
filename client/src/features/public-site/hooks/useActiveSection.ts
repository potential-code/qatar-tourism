import { useEffect, useState } from 'react'
import { NAV_LINKS } from '../components/nav-links'

/**
 * Which homepage section is under the header, for the nav's active state. A section counts once
 * it crosses a band just below the header; the last one to do so wins.
 */
export function useActiveSection(enabled: boolean) {
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      setActive(null)
      return
    }
    const sections = NAV_LINKS.map((link) => document.getElementById(link.hash)).filter(
      (el): el is HTMLElement => el !== null,
    )
    const visible = new Map<string, boolean>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible.set(entry.target.id, entry.isIntersecting)
        const current = [...sections].reverse().find((el) => visible.get(el.id))
        setActive(current?.id ?? null)
      },
      // A thin band 25-30% down the viewport.
      { rootMargin: '-25% 0px -70% 0px' },
    )
    for (const section of sections) observer.observe(section)
    return () => observer.disconnect()
  }, [enabled])

  return active
}
