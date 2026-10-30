import { BellRing, CheckCircle2, Hourglass, Lock, Sparkle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import type { Eligibility } from '../types'

/** Booking state as text and icon, never colour alone. */
export function EligibilityBadge({ eligibility }: { eligibility: Eligibility }) {
  const { t } = useTranslation('sessions')
  switch (eligibility.state) {
    case 'bookable':
      return (
        <Badge variant="outline" className="border-teal/30 bg-teal-mist text-teal-deep">
          <Sparkle aria-hidden /> {t('eligibility.open')}
        </Badge>
      )
    case 'waitlist':
      return (
        <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning">
          <Hourglass aria-hidden /> {t('eligibility.full')}
        </Badge>
      )
    case 'booked':
      return (
        <Badge
          className={
            eligibility.status === 'offered' ? 'bg-warning/15 text-warning' : 'bg-teal text-white'
          }
        >
          {eligibility.status === 'offered' ? (
            <BellRing aria-hidden />
          ) : (
            <CheckCircle2 aria-hidden />
          )}
          {eligibility.status === 'confirmed'
            ? t('eligibility.booked')
            : eligibility.status === 'offered'
              ? t('eligibility.offered')
              : t('eligibility.onWaitlist')}
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="border-stone bg-sand-deep text-ink-soft">
          <Lock aria-hidden /> {t('eligibility.locked')}
        </Badge>
      )
  }
}
