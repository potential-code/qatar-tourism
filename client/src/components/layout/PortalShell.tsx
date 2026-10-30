import type { Role } from '@shared/roles'
import { Outlet, useRouterState } from '@tanstack/react-router'
import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { NavContext } from '@/app/navigation'
import { easeOut } from '@/components/motion/variants'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { usePortalLanguage } from '@/i18n/usePortalLanguage'
import { PortalHeader } from './PortalHeader'
import { PortalSidebar } from './PortalSidebar'

/**
 * Shared frame for the learner, trainer and admin portals.
 * Each route change fades and rises in so moving between pages feels continuous.
 */
export function PortalShell({
  portal,
  notifications,
  navContext,
}: {
  portal: Role
  notifications?: ReactNode
  /** Decides which conditional nav items show (e.g. Certificates only with Program A). */
  navContext?: NavContext
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const reduce = useReducedMotion()
  const { t } = useTranslation('learner')
  // Trainer and admin portals stay English and LTR whatever language the visitor chose.
  usePortalLanguage(portal)

  return (
    <SidebarProvider>
      {/* Keyboard users skip the sidebar and header (WCAG 2.4.1), as on the public site. */}
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-white px-4 py-2 text-ink shadow-md focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
      >
        {t('shell.skipToContent')}
      </a>
      <PortalSidebar portal={portal} navContext={navContext} />
      <SidebarInset className="min-w-0 bg-sand bg-[radial-gradient(60rem_32rem_at_100%_0%,var(--qt-teal-mist),transparent_70%),radial-gradient(50rem_30rem_at_0%_100%,var(--qt-sky-mist),transparent_70%)] bg-fixed">
        <PortalHeader portal={portal} notifications={notifications} />
        <motion.main
          id="main"
          tabIndex={-1}
          key={pathname}
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: easeOut }}
          className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-8 px-4 py-6 outline-none md:px-8 md:py-8"
        >
          <Outlet />
        </motion.main>
      </SidebarInset>
    </SidebarProvider>
  )
}
