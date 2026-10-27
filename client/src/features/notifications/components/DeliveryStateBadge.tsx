import type { NotificationState } from '@shared/constants'
import { CheckCircle2, Clock, FlaskConical, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const META: Record<NotificationState, { label: string; className: string; icon: typeof Clock }> = {
  simulated: {
    label: 'Simulated',
    className: 'border-teal/25 bg-teal-mist text-teal-deep',
    icon: FlaskConical,
  },
  queued: {
    label: 'Queued',
    className: 'border-warning/30 bg-warning/10 text-warning',
    icon: Clock,
  },
  sent: {
    label: 'Delivered in app',
    className: 'border-success/30 bg-success/10 text-success',
    icon: CheckCircle2,
  },
  failed: {
    label: 'Failed',
    className: 'border-destructive/30 bg-destructive/10 text-destructive',
    icon: XCircle,
  },
}

/**
 * Delivery state as the system knows it (brief §11). Emails are always `simulated`: no provider
 * is connected, so nothing is ever described as delivered by email.
 */
export function DeliveryStateBadge({
  state,
  channel,
}: {
  state: NotificationState
  channel: 'in_app' | 'email'
}) {
  const meta = META[state]
  const label =
    channel === 'email' && state === 'simulated' ? 'Simulated: no email sent' : meta.label
  return (
    <Badge variant="outline" className={meta.className}>
      <meta.icon aria-hidden /> {label}
    </Badge>
  )
}
