import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

/** The clear split between Sign in and Create account (brief §3). */
export function AuthSwitch({
  active,
  redirect,
  programme,
}: {
  active: 'login' | 'register'
  redirect?: string
  programme?: 'A' | 'B' | 'C'
}) {
  const item = (on: boolean) =>
    cn(
      'flex-1 rounded-full px-4 py-2 text-center font-medium text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
      on ? 'bg-white text-ink shadow-sm' : 'text-muted-foreground hover:text-ink',
    )
  return (
    <nav aria-label="Account" className="flex rounded-full bg-sand-deep p-1">
      <Link
        to="/login"
        search={{ redirect }}
        aria-current={active === 'login' ? 'page' : undefined}
        className={item(active === 'login')}
      >
        Sign in
      </Link>
      <Link
        to="/register"
        search={{ redirect, programme }}
        aria-current={active === 'register' ? 'page' : undefined}
        className={item(active === 'register')}
      >
        Create account
      </Link>
    </nav>
  )
}
