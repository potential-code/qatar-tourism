import { Link, useRouterState } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { scrollToSection } from '../utils/scroll'
import type { PublicNavLink } from './nav-links'

export function NavLink({
  link,
  light = false,
  active = false,
  large = false,
  onNavigate,
}: {
  link: PublicNavLink
  light?: boolean
  active?: boolean
  large?: boolean
  onNavigate?: () => void
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  return (
    <Link
      to={link.to}
      hash={link.hash}
      onClick={(event) => {
        // Already on the homepage: glide to the section instead of a hard jump.
        if (link.hash && pathname === '/') {
          event.preventDefault()
          scrollToSection(link.hash)
        }
        onNavigate?.()
      }}
      className={cn(
        'relative rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        large
          ? 'block px-2 py-3 font-display text-3xl text-ink hover:text-teal'
          : 'px-3.5 py-2 font-medium text-sm',
        !large &&
          (light
            ? 'text-white/90 hover:bg-white/10 hover:text-white'
            : 'text-ink/80 hover:bg-teal-mist hover:text-teal-deep'),
        !large && active && !light && 'text-teal-deep',
      )}
    >
      {link.label}
    </Link>
  )
}
