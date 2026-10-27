import { RefreshCw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ApiError } from '@/lib/api'

/** Error state with the API's message and a retry (CONVENTIONS: every data view has one). */
export function LoadError({
  error,
  onRetry,
  title = 'This could not be loaded',
}: {
  error: unknown
  onRetry?: () => void
  title?: string
}) {
  const message =
    error instanceof ApiError
      ? error.message
      : 'Check your connection and try again. Your progress is saved.'
  return (
    <div role="alert" className="rounded-xl border border-destructive/20 bg-white">
      <EmptyState
        icon={TriangleAlert}
        variant="destructive"
        title={title}
        description={message}
        action={
          onRetry ? (
            <Button variant="outline" onClick={onRetry}>
              <RefreshCw aria-hidden /> Try again
            </Button>
          ) : undefined
        }
      />
    </div>
  )
}
