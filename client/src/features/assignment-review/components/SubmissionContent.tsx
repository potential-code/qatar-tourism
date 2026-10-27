import { ScrollText } from 'lucide-react'
import { FileChip } from '@/features/assignments/components/FileChip'
import { fileUrl } from '@/features/assignments/utils/files'
import { qatarTime } from '@/features/roleplay/utils/format'
import type { MarkingDetail } from '../types'

/** The learner's work for the version being marked, with the brief to mark against. */
export function SubmissionContent({ detail }: { detail: MarkingDetail }) {
  const version = detail.current
  if (!version) return null
  const isVideo = version.file?.mimeType === 'video/mp4' && version.file.stored
  return (
    <section
      aria-labelledby="submission-heading"
      className="grid gap-5 rounded-xl border bg-card p-5 shadow-xs md:p-6"
    >
      <div className="grid gap-1">
        <h2 id="submission-heading" className="font-display text-2xl font-light text-ink">
          Version {version.version}
        </h2>
        <p className="text-sm text-muted-foreground">
          Submitted {qatarTime(version.submittedAt)}
          {detail.waitingDays > 0 && !version.review ? `, waiting ${detail.waitingDays} days` : ''}
        </p>
      </div>
      <details className="group rounded-lg bg-teal-mist/50 px-4 py-3 text-sm">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-teal-deep">
          <ScrollText aria-hidden className="size-4" /> Assignment brief
        </summary>
        <p className="mt-2 leading-relaxed text-ink">{detail.assignment.brief}</p>
      </details>
      {isVideo ? (
        // biome-ignore lint/a11y/useMediaCaption: learner-submitted fictional role-play has no caption track
        <video
          controls
          preload="metadata"
          className="aspect-video w-full rounded-lg bg-ink"
          src={fileUrl(version.id, true)}
        />
      ) : null}
      {version.file ? <FileChip submissionId={version.id} file={version.file} /> : null}
      {version.responseText ? (
        <div className="grid gap-2">
          <p className="max-h-[30rem] max-w-[70ch] overflow-y-auto whitespace-pre-line pe-2 text-[15px] leading-relaxed text-ink">
            {version.responseText}
          </p>
          <p className="text-xs text-muted-foreground">{version.wordCount} words</p>
        </div>
      ) : null}
    </section>
  )
}
