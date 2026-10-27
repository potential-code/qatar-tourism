import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { TableHead } from '@/components/ui/table'

export type SortState<K extends string> = { key: K; direction: 'asc' | 'desc' }

/** A column header that toggles the client-side sort; aria-sort keeps it accessible. */
export function SortHeader<K extends string>({
  label,
  column,
  sort,
  onSort,
  className,
}: {
  label: string
  column: K
  sort: SortState<K>
  onSort: (next: SortState<K>) => void
  className?: string
}) {
  const active = sort.key === column
  const Icon = !active ? ArrowUpDown : sort.direction === 'asc' ? ArrowUp : ArrowDown
  return (
    <TableHead
      className={className}
      aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-sm font-medium hover:text-teal focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        onClick={() =>
          onSort({ key: column, direction: active && sort.direction === 'asc' ? 'desc' : 'asc' })
        }
      >
        {label}
        <Icon aria-hidden className={active ? 'size-3.5 text-teal' : 'size-3.5 opacity-40'} />
      </button>
    </TableHead>
  )
}

/** Sorts rows by a key: numbers numerically, everything else with a natural string compare. */
export function sortRows<T, K extends keyof T & string>(
  rows: readonly T[],
  sort: SortState<K>,
): T[] {
  const factor = sort.direction === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const x = a[sort.key]
    const y = b[sort.key]
    if (x === y) return 0
    if (x === null || x === undefined) return -1 * factor
    if (y === null || y === undefined) return 1 * factor
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * factor
    return String(x).localeCompare(String(y), 'en-GB', { numeric: true }) * factor
  })
}
