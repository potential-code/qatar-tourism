import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/** A column header that sorts. `aria-sort` tells assistive tech the current order. */
export function SortHeader({
  label,
  active,
  direction,
  onSort,
  numeric,
}: {
  label: string
  active: boolean
  direction: 'asc' | 'desc'
  onSort: () => void
  numeric?: boolean
}) {
  const Icon = !active ? ArrowUpDown : direction === 'asc' ? ArrowUp : ArrowDown
  return (
    <button
      type="button"
      onClick={onSort}
      className={cn(
        'group inline-flex items-center gap-1 rounded-md py-1 text-xs font-medium whitespace-nowrap text-muted-foreground hover:text-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        active && 'text-ink',
        numeric && 'flex-row-reverse',
      )}
    >
      {label}
      <Icon
        className={cn(
          'size-3.5 transition-opacity',
          active ? 'opacity-100 text-teal' : 'opacity-30 group-hover:opacity-70',
        )}
        aria-hidden
      />
    </button>
  )
}
