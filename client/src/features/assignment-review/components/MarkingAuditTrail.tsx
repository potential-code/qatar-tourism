import { History } from 'lucide-react'
import { SUBMISSION_STATUS, type SubmissionStatus } from '@/features/assignments/utils/status'
import { qatarTime } from '@/features/roleplay/utils/format'
import type { MarkerVersion } from '../types'

type Summary = { status?: string; score?: number } | null

function describe(value: unknown) {
  const v = value as Summary
  if (!v) return ''
  const status = v.status ? SUBMISSION_STATUS[v.status as SubmissionStatus]?.label : null
  return [v.score !== undefined ? `${v.score}/100` : null, status?.toLowerCase() ?? null]
    .filter(Boolean)
    .join(', ')
}

/** Corrections after finalisation, with who, when, what and why (brief §11). */
export function MarkingAuditTrail({ versions }: { versions: MarkerVersion[] }) {
  const entries = versions.flatMap((v) => v.corrections.map((c) => ({ ...c, version: v.version })))
  if (entries.length === 0) return null
  return (
    <section
      aria-labelledby="audit-heading"
      className="grid gap-3 rounded-xl border bg-card p-5 shadow-xs"
    >
      <h2
        id="audit-heading"
        className="flex items-center gap-2 font-display text-xl font-light text-ink"
      >
        <History aria-hidden className="size-4 text-teal" /> Corrections
      </h2>
      <ol className="grid gap-3">
        {entries.map((entry) => (
          <li
            key={`${entry.version}-${entry.at}`}
            className="grid gap-1 rounded-lg bg-sand-deep/50 p-3 text-sm"
          >
            <p className="text-ink">
              Version {entry.version}: {describe(entry.before)} changed to {describe(entry.after)}
            </p>
            <p className="text-muted-foreground">Reason: {entry.reason}</p>
            <p className="text-xs text-muted-foreground">
              {entry.by ?? 'Marker'}, {qatarTime(entry.at)}
            </p>
          </li>
        ))}
      </ol>
    </section>
  )
}
