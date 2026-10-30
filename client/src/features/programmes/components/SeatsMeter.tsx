import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('public')
  const remaining = Math.max(0, capacity - booked)
  const full = remaining === 0
  const share = Math.min(100, Math.round((booked / capacity) * 100))
  return (
    <div className={cn('grid gap-1.5', className)}>
      <p className="text-sm">
        {full ? (
          <span className="font-medium text-maroon">
            {waitlisted > 0 ? t('sessions.full', { n: waitlisted }) : t('sessions.fullOpen')}
          </span>
        ) : (
          <>
            <span className="font-medium text-ink">
              {t('sessions.seatsLeft', { n: remaining })}
            </span>
            <span className="text-muted-foreground">
              {t('sessions.ofCapacity', { n: capacity })}
            </span>
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
