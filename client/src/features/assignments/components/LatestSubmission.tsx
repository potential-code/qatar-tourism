import { qatarDateTime } from '@/lib/format/qatar-time'
import type { AssignmentVersion } from '../types'
import { FileChip } from './FileChip'

/** Read-only view of the version waiting for marking. */
export function LatestSubmission({ version }: { version: AssignmentVersion }) {
  return (
    <section
      aria-labelledby="latest-heading"
      className="grid gap-3 rounded-xl border bg-card p-5 shadow-xs md:p-6"
    >
      <div className="grid gap-0.5">
        <h2 id="latest-heading" className="font-display text-2xl font-light text-ink">
          Version {version.version}
        </h2>
        <p className="text-sm text-muted-foreground">
          Submitted {qatarDateTime(version.submittedAt)}
        </p>
      </div>
      {version.file ? <FileChip submissionId={version.id} file={version.file} /> : null}
      {version.responseText ? (
        <div className="grid gap-1">
          <p className="max-h-[30rem] overflow-y-auto whitespace-pre-line pe-2 text-[15px] leading-relaxed text-ink">
            {version.responseText}
          </p>
          <p className="text-xs text-muted-foreground">{version.wordCount} words</p>
        </div>
      ) : null}
    </section>
  )
}
