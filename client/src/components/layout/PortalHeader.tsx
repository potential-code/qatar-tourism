import type { Role } from '@shared/roles'
import { useNavigate } from '@tanstack/react-router'
import { Bell, LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PersonAvatar } from '@/components/data/PersonAvatar'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useSession, useSignOut } from '@/hooks/useSession'
import { DemoBadge } from './DemoBadge'

/**
 * Sticky top bar for all portals. `notifications` slot is filled by the notifications feature.
 * Only the learner portal offers the language switcher: trainer and admin stay English.
 */
export function PortalHeader({
  portal,
  notifications,
}: {
  portal: Role
  notifications?: React.ReactNode
}) {
  const { t } = useTranslation('learner')
  const { session } = useSession()
  const signOut = useSignOut()
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-20 isolate flex h-16 shrink-0 items-center gap-3 overflow-hidden border-b border-teal/10 bg-white/80 px-4 backdrop-blur-md md:px-6">
      <div
        aria-hidden
        className="qt-star-tile pointer-events-none absolute inset-y-0 end-0 -z-10 w-2/3 opacity-70 [mask-image:linear-gradient(to_left,black,transparent)] rtl:[mask-image:linear-gradient(to_right,black,transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-teal via-sky to-gold"
      />
      <SidebarTrigger className="-ms-1" />
      <DemoBadge compact className="hidden sm:flex" />
      <div className="ms-auto flex items-center gap-2">
        {portal === 'learner' ? <LanguageSwitcher /> : null}
        {notifications ?? (
          <Button variant="ghost" size="icon" aria-label={t('shell.notifications')}>
            <Bell aria-hidden />
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {/* Named by its visible text plus a hidden suffix (WCAG 2.5.3 label in name). */}
            <Button variant="ghost" className="h-10 gap-2 px-1.5">
              <span aria-hidden>
                <PersonAvatar
                  name={session?.user.name}
                  src={session?.user.image}
                  tone="teal"
                  className="size-8"
                />
              </span>
              <span className="sr-only max-w-40 truncate text-sm font-medium md:not-sr-only">
                {session?.user.name}
              </span>
              <span className="sr-only">{t('shell.accountMenu')}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="truncate font-medium">{session?.user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{session?.user.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={async () => {
                await signOut()
                await navigate({ to: '/login' as never })
              }}
            >
              <LogOut aria-hidden className="rtl:rotate-180" />
              {t('shell.signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
