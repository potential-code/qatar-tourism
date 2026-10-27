import { ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

/** The demo cancellation and reschedule policy, shown before booking (brief §6). */
export function BookingPolicyNote({ policy, className }: { policy?: string; className?: string }) {
  return (
    <div
      className={cn(
        'flex gap-3 rounded-xl border border-teal/15 bg-teal-mist/60 px-4 py-3 text-sm text-teal-deep',
        className,
      )}
    >
      <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
      <p>
        <span className="font-medium">Cancellation and reschedule policy. </span>
        {policy ??
          'Self-service changes until 24 hours before the session. Later changes request admin review.'}{' '}
        <span className="text-teal-deep/75">
          Illustrative demo default, configurable by the Academy.
        </span>
      </p>
    </div>
  )
}
