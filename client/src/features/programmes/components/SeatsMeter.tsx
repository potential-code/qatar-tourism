import { cn } from '@/lib/utils'

/** Capacity as text first, with a slim meter (status is never colour alone). */
export function SeatsMeter({
  capacity,
  booked,
  waitlisted,
  className,
}: {
  capacity: number
  booked: number
  waitlisted: number
  className?: string
}) {
  const remaining = Math.max(0, capacity - booked)
  const full = remaining === 0
  const share = Math.min(100, Math.round((booked / capacity) * 100))
  return (
    <div className={cn('grid gap-1.5', className)}>
      <p className="text-sm">
        {full ? (
          <span className="font-medium text-maroon">
            Full{waitlisted > 0 ? `, ${waitlisted} on the waitlist` : ', waitlist open'}
          </span>
        ) : (
          <>
            <span className="font-medium text-ink">{remaining} seats left</span>
            <span className="text-muted-foreground"> of {capacity}</span>
          </>
        )}
      </p>
      <div aria-hidden className="h-1 w-full overflow-hidden rounded-full bg-ink/5">
        <div
          className={cn('h-full rounded-full', full ? 'bg-maroon' : 'bg-teal')}
          style={{ width: `${share}%` }}
        />
      </div>
    </div>
  )
}
