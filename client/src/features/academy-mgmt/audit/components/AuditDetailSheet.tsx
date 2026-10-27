import { ArrowRight } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { StatusPill } from '../../hub/components/StatusPill'
import { qDateTime } from '../../hub/utils/format'

export type AuditRow = {
  id: string
  actorLabel: string | null
  actorRole: string
  action: string
  objectType: string
  objectId: string | null
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  reason: string | null
  outcome: 'allowed' | 'denied'
  createdAt: string
}

const show = (value: unknown) =>
  value === undefined
    ? 'Not set'
    : typeof value === 'string'
      ? value
      : Array.isArray(value)
        ? value.join(', ')
        : JSON.stringify(value)

/** Before and after, key by key, so an auditor sees exactly what changed (brief §11). */
export function AuditDetailSheet({ row, onClose }: { row: AuditRow | null; onClose: () => void }) {
  const keys = row
    ? [...new Set([...Object.keys(row.before ?? {}), ...Object.keys(row.after ?? {})])]
    : []
  return (
    <Sheet open={Boolean(row)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {row ? (
          <>
            <SheetHeader className="border-b bg-sand/60 p-6">
              <p className="font-mono text-xs text-teal">{row.action}</p>
              <SheetTitle className="font-display text-2xl font-normal">
                {row.objectType} {row.objectId ?? ''}
              </SheetTitle>
              <SheetDescription>
                {row.actorLabel ?? 'System'} ({row.actorRole}) on {qDateTime(row.createdAt)} Qatar
                time
              </SheetDescription>
              <div>
                <StatusPill tone={row.outcome === 'denied' ? 'bad' : 'good'}>
                  {row.outcome === 'denied' ? 'Denied' : 'Allowed'}
                </StatusPill>
              </div>
            </SheetHeader>
            <div className="grid gap-6 p-6">
              <section className="grid gap-2">
                <h3 className="text-sm font-medium text-ink">Reason</h3>
                <p className="rounded-xl bg-sand/70 p-3 text-sm text-ink/80">
                  {row.reason ?? 'No reason recorded for this action.'}
                </p>
              </section>
              <section className="grid gap-2">
                <h3 className="text-sm font-medium text-ink">
                  {row.before ? 'Before and after' : 'Recorded values'}
                </h3>
                {keys.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No field summary recorded.</p>
                ) : (
                  <ul className="grid gap-2">
                    {keys.map((key) => {
                      const before = row.before?.[key]
                      const after = row.after?.[key]
                      const changed = JSON.stringify(before) !== JSON.stringify(after)
                      if (!row.before)
                        return (
                          <li key={key} className="grid gap-1 rounded-xl border p-3">
                            <p className="text-xs font-medium text-muted-foreground">{key}</p>
                            <p className="text-sm break-words text-ink">{show(after)}</p>
                          </li>
                        )
                      return (
                        <li key={key} className="grid gap-1.5 rounded-xl border p-3">
                          <p className="text-xs font-medium text-muted-foreground">{key}</p>
                          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-sm [&>span]:break-words">
                            <span
                              className={
                                changed && row.before
                                  ? 'rounded-md bg-maroon-mist px-2 py-1 text-maroon-deep line-through decoration-maroon/40'
                                  : 'px-2 py-1 text-muted-foreground'
                              }
                            >
                              {row.before ? show(before) : 'None'}
                            </span>
                            <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
                            <span
                              className={
                                changed
                                  ? 'rounded-md bg-teal-mist px-2 py-1 text-teal-deep'
                                  : 'px-2 py-1'
                              }
                            >
                              {row.after ? show(after) : 'None'}
                            </span>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
              <p className="text-xs text-muted-foreground">
                Audit events are append-only. Summaries never hold personal contact data.
              </p>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
