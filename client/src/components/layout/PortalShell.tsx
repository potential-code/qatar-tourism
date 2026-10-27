import type { Role } from '@shared/roles'
import { Outlet, useRouterState } from '@tanstack/react-router'
import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { easeOut } from '@/components/motion/variants'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { PortalHeader } from './PortalHeader'
import { PortalSidebar } from './PortalSidebar'

/**
 * Shared frame for the learner, trainer and admin portals.
 * Each route change fades and rises in so moving between pages feels continuous.
 */
export function PortalShell({
  portal,
  notifications,
}: {
  portal: Role
  notifications?: ReactNode
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const reduce = useReducedMotion()

  return (
    <SidebarProvider>
      <PortalSidebar portal={portal} />
      <SidebarInset className="bg-sand">
        <PortalHeader notifications={notifications} />
        <motion.main
          key={pathname}
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: easeOut }}
          className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-8 px-4 py-6 md:px-8 md:py-8"
        >
          <Outlet />
        </motion.main>
      </SidebarInset>
    </SidebarProvider>
  )
}
