import { AlertCircle, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Error state for a homepage section that could not load: message plus retry. */
export function SectionError({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-xl border border-destructive/20 bg-white p-6 sm:flex-row sm:items-center"
    >
      <AlertCircle aria-hidden className="size-5 shrink-0 text-destructive" />
      <p className="flex-1 text-sm">
        We could not load {what}. Check your connection and try again.
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RotateCw aria-hidden />
        Try again
      </Button>
    </div>
  )
}
