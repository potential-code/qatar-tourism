import type { Role } from '@shared/roles'
import { Link, type LinkProps } from '@tanstack/react-router'
import { LayoutDashboard, type LucideIcon, NotebookPen, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { useSession } from '@/hooks/useSession'

type NavItem = {
  to: LinkProps['to']
  labelKey: 'nav.dashboard' | 'nav.notes' | 'nav.users'
  icon: LucideIcon
  /** Omit to show to every signed-in user. Visibility only: the API enforces access. */
  roles?: readonly Role[]
}

type NavGroup = { labelKey: 'nav.workspace' | 'nav.admin'; items: NavItem[] }

// The single source of truth for navigation. Add pages here.
const NAV: NavGroup[] = [
  {
    labelKey: 'nav.workspace',
    items: [
      { to: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
      { to: '/notes', labelKey: 'nav.notes', icon: NotebookPen },
    ],
  },
  {
    labelKey: 'nav.admin',
    items: [{ to: '/admin/users', labelKey: 'nav.users', icon: Users, roles: ['admin'] }],
  },
]

export function AppSidebar() {
  const { t, i18n } = useTranslation()
  const { role } = useSession()

  const groups = NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.roles || (role && item.roles.includes(role))),
  })).filter((group) => group.items.length > 0)

  return (
    // The shadcn sidebar positions itself with physical sides, so flip it for RTL.
    <Sidebar collapsible="icon" side={i18n.dir() === 'rtl' ? 'right' : 'left'}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary font-semibold text-sidebar-primary-foreground">
                  {t('app.name').charAt(0)}
                </div>
                <span className="truncate font-semibold">{t('app.name')}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.labelKey}>
            <SidebarGroupLabel>{t(group.labelKey)}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.labelKey}>
                    <SidebarMenuButton asChild tooltip={t(item.labelKey)}>
                      <Link to={item.to} activeProps={{ 'data-active': true }}>
                        <item.icon aria-hidden />
                        <span>{t(item.labelKey)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
