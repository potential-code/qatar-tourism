import { cn } from '@/lib/utils'

/** Seats used against capacity. Fill and the words both carry the state, never colour alone. */
export function CapacityBar({
  used,
  capacity,
  waitlist,
}: {
  used: number
  capacity: number
  waitlist: number
}) {
  const pct = capacity > 0 ? Math.min(100, Math.round((used / capacity) * 100)) : 0
  const tone = pct >= 100 ? 'bg-maroon' : pct >= 80 ? 'bg-warning' : 'bg-teal'
  return (
    <div className="grid min-w-36 gap-1">
      <div className="flex items-baseline justify-between text-xs tabular-nums">
        <span className="font-medium text-ink">
          {used} of {capacity}
        </span>
        <span className="text-muted-foreground">{pct >= 100 ? 'Full' : `${pct}%`}</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-teal-mist"
        role="img"
        aria-label={`${used} of ${capacity} seats booked`}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-700', tone)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {waitlist > 0 ? (
        <span className="text-xs text-maroon">{waitlist} on the waitlist</span>
      ) : null}
    </div>
  )
}
