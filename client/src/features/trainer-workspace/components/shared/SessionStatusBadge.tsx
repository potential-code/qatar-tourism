import type { SessionStatus } from '@shared/constants'
import { Ban, CalendarCheck2, CheckCheck, FilePen, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { STATUS_LABEL } from '@/features/sessions/utils/session-labels'
import { cn } from '@/lib/utils'

const STYLE: Record<SessionStatus, { className: string; icon: typeof Ban }> = {
  draft: { className: 'border-stone bg-sand-deep text-ink-soft', icon: FilePen },
  published: { className: 'border-teal/30 bg-teal-mist text-teal-deep', icon: CalendarCheck2 },
  full: { className: 'border-warning/30 bg-warning/10 text-warning', icon: Users },
  completed: { className: 'border-success/30 bg-success/10 text-success', icon: CheckCheck },
  cancelled: { className: 'border-destructive/25 bg-destructive/10 text-destructive', icon: Ban },
}

/** Draft / Published / Full / Completed / Cancelled (brief §10), as icon plus text. */
export function SessionStatusBadge({
  status,
  className,
}: {
  status: SessionStatus
  className?: string
}) {
  const { className: tone, icon: Icon } = STYLE[status]
  return (
    <Badge variant="outline" className={cn(tone, className)}>
      <Icon aria-hidden /> {STATUS_LABEL[status]}
    </Badge>
  )
}
