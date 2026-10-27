import { FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Visible "Demo data" indicator required on every data screen (brief §12, §16). */
export function DemoBadge({
  className,
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  return (
    <div
      role="note"
      className={cn(
        'flex items-start gap-2 rounded-lg border border-maroon/15 bg-maroon-mist px-3 py-2 text-xs text-maroon-deep',
        compact && 'items-center py-1',
        className,
      )}
    >
      <FlaskConical aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      {compact ? (
        <span className="font-medium">Demo data</span>
      ) : (
        <span>
          <span className="font-medium">Demonstration environment.</span> All learner and training
          data is fictional.
        </span>
      )}
    </div>
  )
}
