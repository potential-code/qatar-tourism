import { cn } from '@/lib/utils'
import { qatarDay, qatarMonth, qatarWeekday } from '../utils/qatar-time'

/** Calendar-leaf date: the day number set large in the display face. Qatar date. */
export function DateTile({
  iso,
  className,
  muted,
}: {
  iso: string
  className?: string
  muted?: boolean
}) {
  return (
    <div
      className={cn(
        'flex w-16 shrink-0 flex-col items-center justify-center rounded-xl border py-2 text-center',
        muted
          ? 'border-stone bg-sand-deep text-ink-muted'
          : 'border-teal/15 bg-teal-mist text-teal-deep',
        className,
      )}
    >
      <span className="text-[11px] font-medium tracking-wide uppercase">{qatarWeekday(iso)}</span>
      <span className="font-display text-3xl leading-none font-light tabular-nums">
        {qatarDay(iso)}
      </span>
      <span className="text-xs">{qatarMonth(iso)}</span>
    </div>
  )
}
