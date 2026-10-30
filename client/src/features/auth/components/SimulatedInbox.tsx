import { Mail } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { SimulatedTag } from '@/components/layout'
import type { SimulatedEmail } from '../queries/auth.queries'

/** The demo inbox: shows the simulated verification email instead of sending one (brief §3). */
export function SimulatedInbox({ email }: { email: SimulatedEmail }) {
  const reduce = useReducedMotion()
  const { t } = useTranslation('auth')
  return (
    <motion.figure
      initial={reduce ? false : { opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="grid gap-3 rounded-xl bg-white p-5 ring-1 ring-ink/5"
      aria-label={t('inbox.aria')}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 font-medium text-sm">
          <Mail aria-hidden className="size-4 text-teal" />
          {t('inbox.title')}
        </span>
        <SimulatedTag label={t('inbox.simulatedEmail')} />
      </div>
      <div className="grid gap-1 border-ink/5 border-t pt-3 text-sm">
        <p className="text-muted-foreground text-xs">{t('inbox.to', { email: email.to })}</p>
        <p className="font-medium">{email.subject}</p>
        <p className="text-muted-foreground leading-relaxed">{email.body}</p>
      </div>
      <p dir="ltr" className="font-display text-3xl text-teal tracking-[0.3em]">
        <span aria-hidden>{email.code}</span>
        <span className="sr-only">
          {t('inbox.code', { digits: email.code.split('').join(' ') })}
        </span>
      </p>
      <figcaption className="text-muted-foreground text-xs">{email.label}.</figcaption>
    </motion.figure>
  )
}
