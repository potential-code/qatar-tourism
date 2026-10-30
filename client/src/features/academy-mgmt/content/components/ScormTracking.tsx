import { positionOf } from '@/services/content-library/bookmarks'
import { qDateTime } from '../../hub/utils/format'
import type { PreviewTracking } from '../hooks/usePreviewScorm'

/**
 * The SCORM tracking test: what the package reported to the hosting runtime. Launch is the entry
 * mode (first launch or resume), then location (the bookmark), score and completion.
 */
export function ScormTracking({
  tracking,
  positions,
}: {
  tracking: PreviewTracking
  positions: number
}) {
  const position = positionOf({ positionPrefix: 'screen' }, tracking.location)
  const rows: [string, string][] = [
    [
      'Launch',
      tracking.launches === 0
        ? 'Not launched'
        : `${tracking.entry === 'resume' ? 'Resumed from a saved bookmark' : 'First launch (ab-initio)'} · launch ${tracking.launches} this session`,
    ],
    [
      'Resume (location)',
      tracking.location
        ? `${tracking.location}${position ? ` · ${position} of ${positions}` : ''}`
        : 'No bookmark yet',
    ],
    [
      'Bookmark size',
      tracking.suspendBytes > 0 ? `${tracking.suspendBytes} characters of suspend data` : 'Empty',
    ],
    ['Score (raw)', tracking.scoreRaw !== null ? `${tracking.scoreRaw}%` : 'Not reported'],
    ['Completion status', tracking.completion],
    ['Success status', tracking.success],
    ['Commits this launch', String(tracking.commits)],
    ['Last commit', tracking.lastCommitAt ? qDateTime(tracking.lastCommitAt) : 'None yet'],
  ]
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Values the package has reported through the SCORM 2004 runtime (scorm-again) in this
        preview. Reload the preview to see a resume.
      </p>
      <dl className="grid gap-2 rounded-lg border bg-white p-4 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-0.5 sm:grid-cols-[10rem_1fr] sm:gap-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
