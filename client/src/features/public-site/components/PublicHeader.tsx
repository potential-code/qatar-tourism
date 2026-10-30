import { ROLE_HOME } from '@shared/roles'
import { Link, useRouterState } from '@tanstack/react-router'
import { ArrowUpRight, Menu } from 'lucide-react'
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring } from 'motion/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Logo, StarPattern } from '@/components/brand'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Magnetic } from '@/components/motion'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useSession } from '@/hooks/useSession'
import { cn } from '@/lib/utils'
import { useActiveSection } from '../hooks/useActiveSection'
import { NavLink } from './NavLink'
import { NAV_LINKS } from './nav-links'

const ease = [0.22, 1, 0.36, 1] as const

/**
 * Public header (brief §2): logo, Academy, Programmes, How it works, Upcoming sessions, language
 * switch, Sign in, Create account. Transparent over the hero;
 * once the page scrolls it condenses into a floating glass bar, steps aside while you read
 * downwards and returns as soon as you scroll up. A teal-to-maroon hairline tracks reading progress.
 */
export function PublicHeader({ overlay = false }: { overlay?: boolean }) {
  const { scrollY, scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 })
  const reduce = useReducedMotion()
  const { t, i18n } = useTranslation('public')
  const rtl = i18n.dir() === 'rtl'
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { session, role } = useSession()
  const activeSection = useActiveSection(pathname === '/')

  useMotionValueEvent(scrollY, 'change', (y) => {
    const previous = scrollY.getPrevious() ?? 0
    setScrolled(y > 48)
    // Only hide once well past the hero's top, and never under reduced motion.
    setHidden(!reduce && y > 480 && y > previous + 4)
    if (y < previous - 4) setHidden(false)
  })

  const light = overlay && !scrolled && !open
  return (
    <motion.header
      initial={reduce ? false : { y: -24, opacity: 0 }}
      animate={{ y: hidden && !open ? '-120%' : 0, opacity: 1 }}
      transition={{ duration: 0.5, ease }}
      className="fixed inset-x-0 top-0 z-40"
    >
      <motion.div
        aria-hidden
        style={{ scaleX: progress }}
        className="absolute inset-x-0 top-0 h-[3px] origin-left bg-gradient-to-r from-teal via-sky to-maroon rtl:origin-right rtl:bg-gradient-to-l"
      />
      <div
        className={cn(
          'mx-auto transition-[max-width,padding,margin] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
          scrolled ? 'mt-3 max-w-[1180px] px-3 md:px-4' : 'mt-0 max-w-[1400px] px-0',
        )}
      >
        <div
          className={cn(
            'relative flex items-center gap-6 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
            scrolled
              ? 'h-14 rounded-full bg-sand/92 ps-4 pe-2 shadow-lg ring-1 ring-ink/5 backdrop-blur-sm md:h-16 md:ps-6'
              : cn(
                  'h-16 px-4 md:h-[72px] md:px-8',
                  !overlay && 'border-ink/5 border-b bg-sand/90 backdrop-blur-md',
                ),
          )}
        >
          {light ? (
            <span
              aria-hidden
              className="absolute inset-x-4 bottom-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent md:inset-x-8"
            />
          ) : null}
          <Link to="/" aria-label={t('brand.home')} className="shrink-0 rounded-md">
            <Logo
              variant={light ? 'white' : 'color'}
              withAcademy
              className={cn('transition-all duration-500', scrolled ? 'h-8 md:h-9' : 'h-9 md:h-10')}
            />
          </Link>
          <nav
            aria-label={t('nav.main')}
            onPointerLeave={() => setHovered(null)}
            onBlur={() => setHovered(null)}
            className="ms-auto hidden items-center gap-0.5 lg:flex"
          >
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.hash}
                link={link}
                light={light}
                active={pathname === '/' && activeSection === link.hash}
                highlighted={hovered === link.hash}
                onHover={() => setHovered(link.hash)}
              />
            ))}
          </nav>
          <div className="ms-auto flex items-center gap-2 lg:ms-2">
            <LanguageSwitcher className="hidden shadow-sm md:inline-flex" />
            {session && role ? (
              <Button asChild size="sm" variant={light ? 'glass' : 'default'}>
                <Link to={ROLE_HOME[role] as never}>{t('nav.myPortal')}</Link>
              </Button>
            ) : (
              <>
                <Button
                  asChild
                  size="sm"
                  variant="ghost"
                  className={cn(
                    'hidden sm:inline-flex',
                    light
                      ? 'text-white hover:bg-white/15 hover:text-white'
                      : 'hover:bg-teal-mist hover:text-teal',
                  )}
                >
                  <Link to="/login">{t('nav.signIn')}</Link>
                </Button>
                <Magnetic strength={0.25} className="hidden sm:inline-flex">
                  <Button asChild size="sm" className="h-9 px-4">
                    <Link to="/register">{t('nav.createAccount')}</Link>
                  </Button>
                </Magnetic>
              </>
            )}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'lg:hidden',
                    light && 'text-white hover:bg-white/15 hover:text-white',
                  )}
                  aria-label={t('nav.openMenu')}
                >
                  <Menu aria-hidden />
                </Button>
              </SheetTrigger>
              <SheetContent
                side={rtl ? 'left' : 'right'}
                className="qt-grain w-[88vw] max-w-sm overflow-hidden border-none bg-grad-night p-0 text-white [&>button]:text-white"
              >
                <SheetTitle className="sr-only">{t('nav.menu')}</SheetTitle>
                <StarPattern className="text-white/[0.06]" size={72} />
                <div className="relative flex h-full flex-col gap-8 p-6 pt-16">
                  <Logo variant="white" withAcademy className="h-9 w-fit" />
                  <LanguageSwitcher className="w-fit" />
                  <nav aria-label={t('nav.main')} className="grid">
                    {NAV_LINKS.map((link, index) => (
                      <motion.div
                        key={link.hash}
                        initial={reduce ? false : { opacity: 0, x: rtl ? -24 : 24 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.08 + 0.06 * index, duration: 0.5, ease }}
                      >
                        <NavLink link={link} large onNavigate={() => setOpen(false)} />
                      </motion.div>
                    ))}
                  </nav>
                  {session ? null : (
                    <div className="mt-auto grid gap-3">
                      <Button
                        asChild
                        size="lg"
                        className="bg-white text-teal-deep hover:bg-sky-mist"
                      >
                        <Link to="/register" onClick={() => setOpen(false)}>
                          {t('nav.createAccount')}
                          <ArrowUpRight aria-hidden className="rtl:-scale-x-100" />
                        </Link>
                      </Button>
                      <Button asChild size="lg" variant="glass">
                        <Link to="/login" onClick={() => setOpen(false)}>
                          {t('nav.signIn')}
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </motion.header>
  )
}
