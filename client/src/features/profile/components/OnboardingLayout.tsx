import { Link, useNavigate } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { CornerPattern, Logo } from '@/components/brand'
import { DemoBadge } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { useSignOut } from '@/hooks/useSession'
import { cn } from '@/lib/utils'

/** Focused frame for onboarding: no portal navigation, just the task and a way out. */
export function OnboardingLayout({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  const { t } = useTranslation('learner')
  const signOut = useSignOut()
  const navigate = useNavigate()
  return (
    <div className="relative isolate min-h-[100dvh] overflow-x-clip bg-sand">
      {/* Quiet brand ground: the star tile in two corners and soft colour glows. */}
      <CornerPattern side="b" className="opacity-70" />
      <div
        aria-hidden
        className="absolute -top-40 -end-40 -z-10 size-[520px] qt-glow text-teal/10"
      />
      <div
        aria-hidden
        className="absolute top-[40rem] -start-48 -z-10 size-[480px] qt-glow text-sky/15"
      />
      <header className="sticky top-0 z-20 border-ink/5 border-b bg-sand/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 md:px-8">
          <Link to="/" aria-label={t('profile.common.homeLabel')}>
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
              {t('profile.common.signOut')}
            </Button>
          </div>
        </div>
      </header>
      <main
        id="main"
        className={cn(
          'mx-auto grid max-w-[1200px] gap-10 px-4 py-8 md:px-8 md:py-12 lg:gap-12',
          aside && 'lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)]',
        )}
      >
        <div className="min-w-0">{children}</div>
        {aside ? <aside className="hidden lg:block">{aside}</aside> : null}
      </main>
    </div>
  )
}
