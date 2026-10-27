import { Link, useNavigate } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import type { ReactNode } from 'react'
import { Logo } from '@/components/brand'
import { DemoBadge } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useSignOut } from '@/hooks/useSession'

/** Focused frame for onboarding: no portal navigation, just the task and a way out. */
export function OnboardingLayout({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  const signOut = useSignOut()
  const navigate = useNavigate()
  return (
    <div className="min-h-[100dvh] bg-sand">
      <header className="border-ink/5 border-b bg-sand/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 md:px-8">
          <Link to="/" aria-label="Qatar Tourism Academy home">
            <Logo withAcademy className="h-9" />
          </Link>
          <div className="flex items-center gap-3">
            <DemoBadge compact className="hidden sm:flex" />
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await signOut()
                await navigate({ to: '/' })
              }}
            >
              <LogOut aria-hidden className="rtl:rotate-180" />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main
        id="main"
        className="mx-auto grid max-w-[1200px] gap-10 px-4 py-10 md:px-8 md:py-14 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:gap-14"
      >
        <div className="min-w-0">{children}</div>
        {aside ? <aside className="hidden lg:block">{aside}</aside> : null}
      </main>
    </div>
  )
}
