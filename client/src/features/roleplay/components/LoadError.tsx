import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'

/** Error state with a retry, for any practice view that failed to load. */
export function LoadError({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <EmptyState
      className="rounded-xl border bg-card"
      variant="destructive"
      icon={AlertCircle}
      title={`${what} could not load`}
      description="Check your connection and try again. Nothing you have saved is lost."
      action={<Button onClick={onRetry}>Try again</Button>}
    />
  )
}
