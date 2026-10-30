import { Check, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type FlowStatus = 'idle' | 'passed' | 'failed' | 'skipped'

export const FLOW_LABELS = [
  'Sign in',
  'Identity check',
  'Academy permissions',
  'Authorised content launch',
] as const

/** Sign in, Identity check, Academy permissions, Authorised content launch (SPEC §2). */
export function FlowStrip({
  statuses = [],
  details = [],
}: {
  statuses?: FlowStatus[]
  details?: string[]
}) {
  return (
    <ol aria-label="Access flow" className="grid gap-2 md:grid-cols-4">
      {FLOW_LABELS.map((label, i) => {
        const status = statuses[i] ?? 'idle'
        return (
          <li
            key={label}
            className={cn(
              'relative flex items-start gap-3 rounded-xl border px-4 py-3 text-sm',
              status === 'passed' && 'border-success/30 bg-success/5',
              status === 'failed' && 'border-destructive/30 bg-destructive/5',
              status === 'skipped' && 'border-dashed bg-muted/40 text-muted-foreground',
              status === 'idle' && 'bg-card',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border text-xs font-medium',
                status === 'passed' && 'border-success bg-success text-white',
                status === 'failed' && 'border-destructive bg-destructive text-white',
                (status === 'idle' || status === 'skipped') && 'border-border bg-sand text-ink',
              )}
            >
              {status === 'passed' ? (
                <Check className="size-3.5" />
              ) : status === 'failed' ? (
                <X className="size-3.5" />
              ) : (
                i + 1
              )}
            </span>
            <span className="grid gap-0.5">
              <span className="font-medium text-ink">{label}</span>
              <span className="sr-only">
                {status === 'idle' ? 'Not run' : status === 'skipped' ? 'Not reached' : status}
              </span>
              {details[i] ? (
                <span className="text-xs text-muted-foreground">{details[i]}</span>
              ) : null}
            </span>
            {i < FLOW_LABELS.length - 1 ? (
              <ChevronRight
                aria-hidden
                className="absolute -right-2.5 top-1/2 z-10 hidden size-4 -translate-y-1/2 rounded-full bg-background text-muted-foreground md:block"
              />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
