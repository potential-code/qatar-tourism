import { Link } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

/** The clear split between Sign in and Create account (brief §3), with a sliding teal pill. */
export function AuthSwitch({
  active,
  redirect,
  programme,
}: {
  active: 'login' | 'register'
  redirect?: string
  programme?: 'A' | 'B' | 'C'
}) {
  const { t } = useTranslation('auth')
  const item = (on: boolean) =>
    cn(
      'relative isolate flex-1 rounded-full px-4 py-2.5 text-center font-medium text-sm transition-colors duration-300 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
      on ? 'text-white' : 'text-ink/75 hover:text-teal',
    )
  const pill = (
    <motion.span
      layoutId="auth-switch-pill"
      aria-hidden
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      className="absolute inset-0 -z-10 rounded-full bg-grad-teal shadow-glow"
    />
  )
  return (
    <nav
      aria-label={t('switch.aria')}
      className="flex rounded-full bg-sand-deep p-1.5 shadow-[var(--qt-shadow-inset)]"
    >
      <Link
        to="/login"
        search={{ redirect }}
        aria-current={active === 'login' ? 'page' : undefined}
        className={item(active === 'login')}
      >
        {active === 'login' ? pill : null}
        {t('switch.signIn')}
      </Link>
      <Link
        to="/register"
        search={{ redirect, programme }}
        aria-current={active === 'register' ? 'page' : undefined}
        className={item(active === 'register')}
      >
        {active === 'register' ? pill : null}
        {t('switch.createAccount')}
      </Link>
    </nav>
  )
}
