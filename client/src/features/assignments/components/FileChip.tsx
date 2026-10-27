import { Download, FileText, Film } from 'lucide-react'
import type { VersionFile } from '../types'
import { fileUrl, formatBytes } from '../utils/files'

/** An attached file. Seeded records carry details only, and say so instead of a dead link. */
export function FileChip({ submissionId, file }: { submissionId: string; file: VersionFile }) {
  const Icon = file.mimeType === 'video/mp4' ? Film : FileText
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-white px-3 py-2">
      <Icon aria-hidden className="size-5 shrink-0 text-teal" />
      <div className="grid min-w-0 flex-1">
        <span className="truncate text-sm font-medium text-ink">{file.name}</span>
        <span className="text-xs text-muted-foreground">
          {formatBytes(file.sizeBytes)}
          {file.stored ? '' : ', sample record: file details only'}
        </span>
      </div>
      {file.stored ? (
        <a
          href={fileUrl(submissionId)}
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-teal-deep transition-colors hover:bg-teal-mist focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Download aria-hidden className="size-3.5" /> Download
        </a>
      ) : null}
    </div>
  )
}
