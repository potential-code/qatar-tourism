import type { Role } from '@shared/roles'
import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import {
  NAV_BY_ROLE,
  type NavContext,
  type NavItem,
  PORTAL_LABEL,
  visibleNav,
} from '@/app/navigation'
import { Logo } from '@/components/brand/Logo'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { DemoBadge } from './DemoBadge'

function isActive(pathname: string, to: string, exact: boolean) {
  return exact
    ? pathname === to || pathname === `${to}/`
    : pathname === to || pathname.startsWith(`${to}/`)
}

const UNKNOWN_CONTEXT: NavContext = { programmes: null }

/**
 * Branded portal sidebar. Children are nested under their parent (admin hierarchy, brief §12).
 * Items with a `visible` rule are filtered against `navContext`.
 */
export function PortalSidebar({
  portal,
  navContext = UNKNOWN_CONTEXT,
}: {
  portal: Role
  navContext?: NavContext
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const sections = visibleNav(NAV_BY_ROLE[portal], navContext)
  const home = sections[0]?.items[0]?.to ?? '/'

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="gap-3 px-3 pt-5 pb-3">
        <Link
          to={home as never}
          className="flex h-11 items-center group-data-[collapsible=icon]:h-8"
          aria-label="Academy home"
        >
          <Logo withAcademy className="h-full group-data-[collapsible=icon]:[&>span]:hidden" />
        </Link>
        <p className="text-xs font-medium tracking-wide text-muted-foreground group-data-[collapsible=icon]:hidden">
          {PORTAL_LABEL[portal]}
        </p>
      </SidebarHeader>
      <SidebarContent>
        {sections.map((section, i) => (
          <SidebarGroup key={section.label ?? i}>
            {section.label ? <SidebarGroupLabel>{section.label}</SidebarGroupLabel> : null}
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) =>
                  item.children ? (
                    <NestedItem key={item.to} item={item} pathname={pathname} />
                  ) : (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.label}
                        isActive={isActive(pathname, item.to, item.to === home)}
                        className="data-[active=true]:bg-teal-mist data-[active=true]:text-teal-deep data-[active=true]:font-medium"
                      >
                        <Link to={item.to as never}>
                          {item.icon ? <item.icon aria-hidden /> : null}
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ),
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="p-3 group-data-[collapsible=icon]:hidden">
        <DemoBadge />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function NestedItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const open =
    isActive(pathname, item.to, false) ||
    Boolean(item.children?.some((c) => isActive(pathname, c.to, c.to === item.to)))
  return (
    <Collapsible asChild defaultOpen={open} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            tooltip={item.label}
            className={open ? 'font-medium text-teal-deep' : undefined}
          >
            {item.icon ? <item.icon aria-hidden /> : null}
            <span>{item.label}</span>
            <ChevronRight
              aria-hidden
              className="ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 rtl:-scale-x-100"
            />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children?.map((child) => (
              <SidebarMenuSubItem key={child.to}>
                <SidebarMenuSubButton
                  asChild
                  isActive={isActive(pathname, child.to, child.to === item.to)}
                  className="data-[active=true]:bg-teal-mist data-[active=true]:text-teal-deep"
                >
                  <Link to={child.to as never}>
                    <span>{child.label}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}
