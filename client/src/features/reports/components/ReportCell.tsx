import { PROGRAMME_LABELS } from '@shared/schemas/admin-labels'
import { Badge } from '@/components/ui/badge'
import { qatarDate, qatarDateTime } from '@/features/admin-dashboard/utils/format'
import { cn } from '@/lib/utils'
import type { ReportColumn } from '../queries/reports.queries'

type Value = string | number | boolean | null | undefined

/** Status words map to a tone, and the word itself is always shown: never colour alone. */
const STATUS_TONE: Record<string, string> = {
  Completed: 'border-teal/30 bg-teal-mist text-teal-deep',
  Approved: 'border-teal/30 bg-teal-mist text-teal-deep',
  Issued: 'border-teal/30 bg-teal-mist text-teal-deep',
  Passed: 'border-teal/30 bg-teal-mist text-teal-deep',
  Published: 'border-teal/30 bg-teal-mist text-teal-deep',
  Sent: 'border-teal/30 bg-teal-mist text-teal-deep',
  Allowed: 'border-teal/30 bg-teal-mist text-teal-deep',
  'In progress': 'border-ink/15 bg-sand-deep text-ink',
  'Not started': 'border-ink/10 bg-white text-muted-foreground',
  Draft: 'border-ink/10 bg-white text-muted-foreground',
  'Baseline recorded': 'border-ink/10 bg-white text-muted-foreground',
  'Awaiting review': 'border-maroon/20 bg-maroon-mist text-maroon-deep',
  Submitted: 'border-maroon/20 bg-maroon-mist text-maroon-deep',
  'Under review': 'border-maroon/20 bg-maroon-mist text-maroon-deep',
  'Returned for revision': 'border-maroon/20 bg-maroon-mist text-maroon-deep',
  Full: 'border-maroon/20 bg-maroon-mist text-maroon-deep',
  Simulated: 'border-teal/20 bg-white text-teal-deep',
  Queued: 'border-ink/15 bg-sand-deep text-ink',
  'Below pass mark': 'border-destructive/30 bg-destructive/5 text-destructive',
  Cancelled: 'border-destructive/30 bg-destructive/5 text-destructive',
  Revoked: 'border-destructive/30 bg-destructive/5 text-destructive',
  Failed: 'border-destructive/30 bg-destructive/5 text-destructive',
  Denied: 'border-destructive/30 bg-destructive/5 text-destructive',
}

export function formatCell(column: Pick<ReportColumn, 'type'>, value: Value): string {
  if (value === null || value === undefined || value === '') return 'None'
  switch (column.type) {
    case 'date':
      return qatarDate(String(value))
    case 'datetime':
      return qatarDateTime(String(value))
    case 'percent':
      return `${value}%`
    case 'programme':
      return PROGRAMME_LABELS[value as 'A' | 'B' | 'C'] ?? String(value)
    case 'number':
    case 'score':
      return typeof value === 'number' ? value.toLocaleString('en-GB') : String(value)
    default:
      return String(value)
  }
}

export function ReportCell({ column, value }: { column: ReportColumn; value: Value }) {
  const empty = value === null || value === undefined || value === ''
  if (empty) return <span className="text-muted-foreground/60">None</span>
  if (column.type === 'status')
    return (
      <Badge
        variant="outline"
        className={cn('rounded-full font-medium', STATUS_TONE[String(value)])}
      >
        {String(value)}
      </Badge>
    )
  if (column.type === 'programme')
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <span className="grid size-5 place-items-center rounded-full bg-teal-mist text-[10px] font-semibold text-teal-deep">
          {String(value)}
        </span>
        <span className="text-muted-foreground">{formatCell(column, value)}</span>
      </span>
    )
  if (column.type === 'code')
    return <span className="font-mono text-xs whitespace-nowrap text-ink">{String(value)}</span>
  if (column.type === 'percent' && typeof value === 'number')
    return (
      <span className="flex items-center gap-2 tabular-nums">
        <span className="h-1.5 w-12 overflow-hidden rounded-full bg-teal-mist">
          <span
            className="block h-full rounded-full bg-teal"
            style={{ width: `${Math.min(100, value)}%` }}
          />
        </span>
        {value}%
      </span>
    )
  if (column.type === 'number' || column.type === 'score')
    return <span className="tabular-nums">{formatCell(column, value)}</span>
  if (column.type === 'date' || column.type === 'datetime')
    return <span className="whitespace-nowrap">{formatCell(column, value)}</span>
  return <span className="line-clamp-2 min-w-[7rem]">{formatCell(column, value)}</span>
}
