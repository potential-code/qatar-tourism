import { RefreshCw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'

/** Error with the server's message and a retry (CONVENTIONS: every data view has one). */
export function ErrorPanel({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message = error instanceof Error ? error.message : 'Something went wrong while loading.'
  return (
    <div className="rounded-xl border border-destructive/20 bg-card">
      <EmptyState
        icon={TriangleAlert}
        variant="destructive"
        title="This view could not be loaded"
        description={message}
        action={
          <Button variant="outline" onClick={onRetry}>
            <RefreshCw /> Try again
          </Button>
        }
      />
    </div>
  )
}

/** Skeleton rows in the shape of a table. */
export function TableSkeleton({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="grid gap-3 p-6" role="status" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, r) => `row-${r}`).map((rowKey) => (
        <div
          key={rowKey}
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: cols }, (_, c) => `${rowKey}-${c}`).map((cellKey) => (
            <Skeleton key={cellKey} className="h-4" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardsSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div
      className={className ?? 'grid gap-5 lg:grid-cols-3'}
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      {Array.from({ length: count }, (_, i) => `card-${i}`).map((key) => (
        <Skeleton key={key} className="h-44 rounded-xl" />
      ))}
    </div>
  )
}
