import { CircleDashed } from 'lucide-react'
import { CountUp } from '@/components/motion/CountUp'
import { cn } from '@/lib/utils'

/**
 * A big result number on a dark brand ground, or a clear pill when there is no result yet.
 * The empty state is white UI text with an icon, so it stays readable (AA) and is never
 * conveyed by colour alone.
 */
export function ResultValue({
  value,
  suffix,
  prefix,
  unit,
  empty,
  className,
}: {
  value: number | null
  suffix?: string
  prefix?: string
  /** Small trailing unit such as "/100", set in UI type beside the number. */
  unit?: string
  empty: string
  className?: string
}) {
  if (value === null) {
    return (
      <span className="inline-flex items-center self-start gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1 font-sans text-sm font-medium text-white">
        <CircleDashed aria-hidden className="size-3.5" />
        {empty}
      </span>
    )
  }
  return (
    <span
      dir="ltr"
      className={cn(
        'font-display text-4xl leading-none font-light text-white tabular-nums md:text-5xl',
        className,
      )}
    >
      <CountUp value={value} suffix={suffix} prefix={prefix} />
      {unit ? (
        <span className="ms-0.5 font-sans text-base font-normal text-white/80">{unit}</span>
      ) : null}
    </span>
  )
}
