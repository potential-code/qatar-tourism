import { CheckCircle2, CloudUpload, TriangleAlert } from 'lucide-react'
import type { LiveStatus } from '../hooks/useScormRuntime'

/** Live CMI status from the running package, announced politely. */
export function ScormStatusLine({ status }: { status: LiveStatus | null }) {
  return (
    <p
      aria-live="polite"
      className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground"
    >
      <span className="font-medium text-ink">SCORM 2004 runtime connected</span>
      {status ? (
        <>
          <span>Location {status.location || 'start'}</span>
          <span className="capitalize">{status.completion}</span>
          {status.scoreRaw !== null ? <span>Score {status.scoreRaw}%</span> : null}
          {status.saving ? (
            <span className="inline-flex items-center gap-1">
              <CloudUpload aria-hidden className="size-3.5" /> Saving
            </span>
          ) : status.error ? (
            <span className="inline-flex items-center gap-1 text-destructive">
              <TriangleAlert aria-hidden className="size-3.5" /> Not saved, it will retry on the
              next step
            </span>
          ) : status.saved ? (
            <span className="inline-flex items-center gap-1 text-teal">
              <CheckCircle2 aria-hidden className="size-3.5" /> Saved
            </span>
          ) : null}
        </>
      ) : (
        <span>Waiting for the package to start</span>
      )}
    </p>
  )
}
