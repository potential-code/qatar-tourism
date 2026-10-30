import { SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Marks any threshold or rule that is a proposed demonstration setting rather than confirmed
 * Qatar Tourism policy (validity, CPD target, reminder intervals, offer window, pass marks).
 * Show it next to every such value.
 */
export function DemoSettingsNote({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-teal/20 bg-teal-mist px-2.5 py-1 text-xs font-medium text-teal-deep',
        className,
      )}
    >
      <SlidersHorizontal aria-hidden className="size-3.5" />
      Demo settings — subject to Qatar Tourism confirmation
    </p>
  )
}
