import { Link, useRouterState } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { scrollToSection } from '../utils/scroll'
import type { PublicNavLink } from './nav-links'

export function NavLink({
  link,
  light = false,
  active = false,
  large = false,
  highlighted = false,
  onHover,
  onNavigate,
}: {
  link: PublicNavLink
  light?: boolean
  active?: boolean
  large?: boolean
  /** Draws the shared sliding pill behind this link (desktop bar). */
  highlighted?: boolean
  onHover?: () => void
  onNavigate?: () => void
}) {
  const { t } = useTranslation('public')
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  return (
    <Link
      to="/"
      hash={link.hash}
      onPointerEnter={onHover}
      onFocus={onHover}
      onClick={(event) => {
        // Already on the homepage: glide to the section instead of a hard jump.
        if (pathname === '/') {
          event.preventDefault()
          scrollToSection(link.hash)
        }
        onNavigate?.()
      }}
      className={cn(
        'relative isolate rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        large
          ? 'group flex items-baseline justify-between gap-4 border-white/10 border-b px-1 py-4 font-display font-light text-3xl text-white hover:text-gold-soft'
          : 'px-4 py-2 font-medium text-sm',
        !large && (light ? 'text-white/90 hover:text-white' : 'text-ink/80 hover:text-teal'),
        !large && active && (light ? 'text-white' : 'text-teal'),
      )}
    >
      {highlighted && !large ? (
        <motion.span
          layoutId="nav-pill"
          aria-hidden
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className={cn(
            'absolute inset-0 -z-10 rounded-full',
            light ? 'bg-white/15 ring-1 ring-white/20' : 'bg-teal-mist',
          )}
        />
      ) : null}
      {t(link.labelKey)}
      {active && !large ? (
        <span
          aria-hidden
          className={cn(
            'absolute start-1/2 bottom-0.5 size-1 -translate-x-1/2 rounded-full rtl:translate-x-1/2',
            light ? 'bg-gold' : 'bg-teal',
          )}
        />
      ) : null}
    </Link>
  )
}
