import type { Role } from '@shared/roles'
import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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

/** Translated label of a learner item; other portals keep their English label. */
function useNavLabel() {
  const { t } = useTranslation('learner')
  return (item: NavItem) => (item.labelKey ? t(`nav.${item.labelKey}`) : item.label)
}

function isActive(pathname: string, to: string, exact: boolean) {
  return exact
    ? pathname === to || pathname === `${to}/`
    : pathname === to || pathname.startsWith(`${to}/`)
}

/** Active item: a soft white pill with a gold bar on its start edge (dct-learn's `.ni.on`). */
const ACTIVE_ITEM =
  'relative data-[active=true]:font-medium data-[active=true]:before:absolute data-[active=true]:before:inset-y-1.5 data-[active=true]:before:start-0 data-[active=true]:before:w-1 data-[active=true]:before:rounded-full data-[active=true]:before:bg-gold data-[active=true]:[&>svg]:text-gold'

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
  const { t } = useTranslation('learner')
  const navLabel = useNavLabel()
  const sections = visibleNav(NAV_BY_ROLE[portal], navContext)
  const home = sections[0]?.items[0]?.to ?? '/'

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <div aria-hidden className="qt-sidebar-tile qt-star-tile-dark" />
      <SidebarHeader className="gap-3 px-3 pt-5 pb-3">
        <Link
          to={home as never}
          className="flex h-11 items-center group-data-[collapsible=icon]:h-8"
          aria-label={t('shell.academyHome')}
        >
          <Logo
            variant="white"
            withAcademy
            className="h-full group-data-[collapsible=icon]:[&>span]:hidden"
          />
        </Link>
        <p className="text-xs font-semibold tracking-[0.14em] text-gold uppercase group-data-[collapsible=icon]:hidden">
          {portal === 'learner' ? t('shell.portalLearner') : PORTAL_LABEL[portal]}
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
                        tooltip={navLabel(item)}
                        isActive={isActive(pathname, item.to, item.to === home)}
                        className={ACTIVE_ITEM}
                      >
                        <Link to={item.to as never}>
                          {item.icon ? <item.icon aria-hidden /> : null}
                          <span>{navLabel(item)}</span>
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
        <DemoBadge tone="dark" />
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
            className={open ? 'font-medium text-white' : undefined}
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
                  className="data-[active=true]:font-medium"
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
