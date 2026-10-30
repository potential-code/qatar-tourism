import { Hammer } from 'lucide-react'

/**
 * Placeholder body for a screen that is scheduled but not built yet. The lane that owns the
 * screen replaces the whole component body, so remove this import when you do.
 */
export function InProgress({ note }: { note?: string }) {
  return (
    <div
      role="status"
      className="grid place-items-center gap-2 rounded-xl border border-dashed bg-card px-6 py-16 text-center"
    >
      <Hammer aria-hidden className="size-6 text-teal" />
      <p className="font-display text-xl text-ink">In progress</p>
      {note ? <p className="max-w-[60ch] text-sm text-muted-foreground">{note}</p> : null}
    </div>
  )
}
