import { ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

/** The demo cancellation and reschedule policy, shown before booking (brief §6). */
export function BookingPolicyNote({ policy, className }: { policy?: string; className?: string }) {
  const { t } = useTranslation('sessions')
  return (
    <div
      className={cn(
        'flex gap-3 rounded-xl border border-teal/15 bg-teal-mist/60 px-4 py-3 text-sm text-teal-deep',
        className,
      )}
    >
      <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
      <p>
        <span className="font-medium">{t('policy.title')} </span>
        {policy ?? t('policy.default')} <span className="text-teal-deep">{t('policy.note')}</span>
      </p>
    </div>
  )
}
