import { History } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { PathVersion } from '../types'

const qatarDate = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Qatar',
  }).format(new Date(iso))

/**
 * Every version with the enrolments that are on it (brief §14: existing learners retain their
 * assigned version; completion records stay with the version they were earned on).
 */
export function VersionHistory({ versions }: { versions: PathVersion[] }) {
  return (
    <ol className="grid gap-3" aria-label="Version history, newest first">
      {versions.map((v) => (
        <li
          key={v.id}
          className={cn(
            'grid gap-2 rounded-xl border p-4',
            v.isCurrent ? 'border-teal/40 bg-teal-mist/40' : 'bg-card',
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 font-display text-lg text-ink">
              <History aria-hidden className="size-4 text-teal" /> Version {v.version}
            </p>
            <Badge
              variant="outline"
              className={cn(
                v.status === 'published' && 'border-teal/30 text-teal-deep',
                v.status === 'draft' && 'border-maroon/30 bg-maroon-mist text-maroon-deep',
              )}
            >
              {v.isCurrent ? 'Current, published' : v.status === 'draft' ? 'Draft' : 'Archived'}
            </Badge>
          </div>
          {v.changeNote ? <p className="text-sm text-ink/80">{v.changeNote}</p> : null}
          <p className="text-xs text-muted-foreground">
            {v.publishedAt
              ? `Published ${qatarDate(v.publishedAt)} Qatar time${v.publishedBy ? ` by ${v.publishedBy}` : ''}`
              : `Last edited ${qatarDate(v.updatedAt)} Qatar time`}
            , {v.items.length} items
          </p>
          <dl className="grid grid-cols-4 gap-2 border-t pt-2 text-center">
            {(
              [
                ['On this version', v.enrolments.total],
                ['Not started', v.enrolments.notStarted],
                ['In progress', v.enrolments.inProgress + v.enrolments.awaitingReview],
                ['Completed', v.enrolments.completed],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <dt className="text-[10px] text-muted-foreground">{label}</dt>
                <dd className="font-display text-lg tabular-nums text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </li>
      ))}
    </ol>
  )
}
