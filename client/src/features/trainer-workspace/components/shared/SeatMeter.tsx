import { cn } from '@/lib/utils'

/** Booked seats against capacity, with the count in text (status is never colour alone). */
export function SeatMeter({
  confirmed,
  capacity,
  waitlisted = 0,
  className,
  tone = 'teal',
}: {
  confirmed: number
  capacity: number
  waitlisted?: number
  className?: string
  tone?: 'teal' | 'white'
}) {
  const share = Math.min(100, Math.round((confirmed / Math.max(1, capacity)) * 100))
  return (
    <div className={cn('grid gap-1.5', className)}>
      <div
        className={cn(
          'flex justify-between text-xs',
          tone === 'white' ? 'text-white/80' : 'text-muted-foreground',
        )}
      >
        <span>
          {confirmed} of {capacity} booked
        </span>
        {waitlisted > 0 ? <span>{waitlisted} waitlisted</span> : null}
      </div>
      <div
        className={cn(
          'h-1.5 overflow-hidden rounded-full',
          tone === 'white' ? 'bg-white/25' : 'bg-stone',
        )}
        aria-hidden
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-700',
            tone === 'white' ? 'bg-white' : share >= 100 ? 'bg-warning' : 'bg-teal',
          )}
          style={{ width: `${share}%` }}
        />
      </div>
    </div>
  )
}
