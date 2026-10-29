import { ScrollText } from 'lucide-react'
import { FileChip } from '@/features/assignments/components/FileChip'
import { useSubmissionFileUrl } from '@/features/assignments/hooks/useSubmissionFileUrl'
import { qatarDateTime } from '@/lib/format/qatar-time'
import type { MarkingDetail } from '../types'

/** The learner's work for the version being marked, with the brief to mark against. */
export function SubmissionContent({ detail }: { detail: MarkingDetail }) {
  const version = detail.current
  const stored = Boolean(version?.file?.stored)
  const preview = useSubmissionFileUrl(version?.id ?? '', stored)
  if (!version) return null
  const isVideo = version.file?.mimeType === 'video/mp4' && preview.url
  const isPdf = version.file?.mimeType === 'application/pdf' && preview.url
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
          Submitted {qatarDateTime(version.submittedAt)}
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
          src={preview.url ?? undefined}
        />
      ) : null}
      {isPdf ? (
        <iframe
          title={`Preview of ${version.file?.name ?? 'the submitted file'}`}
          src={preview.url ?? undefined}
          className="h-[32rem] w-full rounded-lg border bg-white"
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
