import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { DemoToolbar } from '@/features/demo-toolbar/components/DemoToolbar'
import type { RouterContext } from '@/lib/router-context'

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <>
      <Outlet />
      {/* Demo facilitator toolbar (brief §3): renders only for the demo administrator. */}
      <DemoToolbar />
    </>
  ),
})
