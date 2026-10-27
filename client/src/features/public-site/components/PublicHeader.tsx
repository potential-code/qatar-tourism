import { ROLE_HOME } from '@shared/roles'
import { Link, useRouterState } from '@tanstack/react-router'
import { Menu } from 'lucide-react'
import { motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react'
import { useState } from 'react'
import { Logo } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useSession } from '@/hooks/useSession'
import { cn } from '@/lib/utils'
import { NavLink } from './NavLink'
import { NAV_LINKS } from './nav-links'

/**
 * Public header (brief §2): logo, Academy, Programmes, How it works, Upcoming sessions, Sign in,
 * Create account. No language control: English is the only language. Transparent over the hero,
 * solid once the page scrolls.
 */
export function PublicHeader({ overlay = false }: { overlay?: boolean }) {
  const { scrollY } = useScroll()
  const reduce = useReducedMotion()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { session, role } = useSession()
  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 48))

  const light = overlay && !scrolled && !open
  return (
    <motion.header
      initial={reduce ? false : { y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-colors duration-300',
        light ? 'bg-transparent' : 'border-ink/5 border-b bg-sand/90 backdrop-blur-md',
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-6 px-4 md:h-[72px] md:px-8">
        <Link to="/" aria-label="Qatar Tourism Academy home" className="shrink-0 rounded-md">
          <Logo variant={light ? 'white' : 'color'} withAcademy className="h-9 md:h-10" />
        </Link>
        <nav aria-label="Main" className="ms-auto hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.label}
              link={link}
              light={light}
              active={!link.hash && pathname === link.to}
            />
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-2 lg:ms-2">
          {session && role ? (
            <Button asChild size="sm" variant={light ? 'glass' : 'default'}>
              <Link to={ROLE_HOME[role] as never}>Go to my portal</Link>
            </Button>
          ) : (
            <>
              <Button
                asChild
                size="sm"
                variant="ghost"
                className={cn(
                  'hidden sm:inline-flex',
                  light && 'text-white hover:bg-white/15 hover:text-white',
                )}
              >
                <Link to="/login">Sign in</Link>
              </Button>
              <Button
                asChild
                size="sm"
                variant={light ? 'glass' : 'default'}
                className="hidden sm:inline-flex"
              >
                <Link to="/register">Create account</Link>
              </Button>
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
                aria-label="Open menu"
              >
                <Menu aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[86vw] max-w-sm bg-sand p-0">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="flex h-full flex-col gap-8 p-6 pt-16">
                <nav aria-label="Main" className="grid gap-1">
                  {NAV_LINKS.map((link, index) => (
                    <motion.div
                      key={link.label}
                      initial={reduce ? false : { opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.06 * index, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <NavLink link={link} large onNavigate={() => setOpen(false)} />
                    </motion.div>
                  ))}
                </nav>
                {session ? null : (
                  <div className="mt-auto grid gap-3">
                    <Button asChild size="lg">
                      <Link to="/register" onClick={() => setOpen(false)}>
                        Create account
                      </Link>
                    </Button>
                    <Button asChild size="lg" variant="outline">
                      <Link to="/login" onClick={() => setOpen(false)}>
                        Sign in
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </motion.header>
  )
}
