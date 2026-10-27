import { CheckCircle2, Hourglass, Lock, Sparkle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Eligibility } from '../types'

/** Booking state as text and icon, never colour alone. */
export function EligibilityBadge({ eligibility }: { eligibility: Eligibility }) {
  switch (eligibility.state) {
    case 'bookable':
      return (
        <Badge variant="outline" className="border-teal/30 bg-teal-mist text-teal-deep">
          <Sparkle aria-hidden /> Open for booking
        </Badge>
      )
    case 'waitlist':
      return (
        <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning">
          <Hourglass aria-hidden /> Full, waitlist open
        </Badge>
      )
    case 'booked':
      return (
        <Badge className="bg-teal text-white">
          <CheckCircle2 aria-hidden />
          {eligibility.status === 'confirmed' ? 'You are booked' : 'You are on the waitlist'}
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="border-stone bg-sand-deep text-ink-soft">
          <Lock aria-hidden /> Locked
        </Badge>
      )
  }
}
