import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ApiError } from '@/lib/api-error'

/** Error state for a data view: what went wrong, and a retry (brief §17 resilience). */
export function QueryErrorPanel({
  error,
  onRetry,
  title = 'This could not be loaded',
}: {
  error: unknown
  onRetry: () => void
  title?: string
}) {
  const message =
    error instanceof ApiError
      ? error.message
      : 'The connection to the Academy service failed. Check your network and try again.'
  return (
    <div className="rounded-xl border border-destructive/20 bg-card">
      <EmptyState
        icon={AlertTriangle}
        variant="destructive"
        title={title}
        description={message}
        action={
          <Button variant="outline" onClick={onRetry}>
            <RotateCcw aria-hidden /> Try again
          </Button>
        }
      />
    </div>
  )
}
