import { Download, ExternalLink, FileText, Film } from 'lucide-react'
import { useSubmissionFileUrl } from '../hooks/useSubmissionFileUrl'
import type { VersionFile } from '../types'
import { formatBytes } from '../utils/files'

const PREVIEWABLE = new Set(['application/pdf', 'video/mp4'])

const linkClass =
  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-teal-deep transition-colors hover:bg-teal-mist focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'

/**
 * An attached file. Files uploaded in this browser open and download from an object URL;
 * seeded records carry details only, and say so instead of a dead link.
 */
export function FileChip({ submissionId, file }: { submissionId: string; file: VersionFile }) {
  const Icon = file.mimeType === 'video/mp4' ? Film : FileText
  const stored = useSubmissionFileUrl(submissionId, file.stored)
  const note = !file.stored
    ? ', sample file, not stored in this demo'
    : stored.isError
      ? ', file not available in this browser'
      : ''
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-white px-3 py-2">
      <Icon aria-hidden className="size-5 shrink-0 text-teal" />
      <div className="grid min-w-0 flex-1">
        <span className="truncate text-sm font-medium text-ink">{file.name}</span>
        <span className="text-xs text-muted-foreground">
          {formatBytes(file.sizeBytes)}
          {note}
        </span>
      </div>
      {stored.url ? (
        <div className="flex shrink-0 items-center gap-1">
          {file.mimeType && PREVIEWABLE.has(file.mimeType) ? (
            <a href={stored.url} target="_blank" rel="noopener" className={linkClass}>
              <ExternalLink aria-hidden className="size-3.5" /> Open
              <span className="sr-only"> {file.name} in a new tab</span>
            </a>
          ) : null}
          <a href={stored.url} download={file.name} className={linkClass}>
            <Download aria-hidden className="size-3.5" /> Download
          </a>
        </div>
      ) : null}
    </div>
  )
}
