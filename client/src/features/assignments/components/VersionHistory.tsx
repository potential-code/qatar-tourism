import { motion, useReducedMotion } from 'motion/react'
import { easeOut } from '@/components/motion/variants'
import { qatarTime } from '@/features/roleplay/utils/format'
import { cn } from '@/lib/utils'
import { SUBMISSION_STATUS, type SubmissionStatus } from '../utils/status'
import { FileChip } from './FileChip'
import { StatusPill } from './StatusPill'

export type HistoryVersion = {
  id: string
  version: number
  status: SubmissionStatus
  responseText: string | null
  wordCount: number | null
  file: { name: string; mimeType: string | null; sizeBytes: number | null; stored: boolean } | null
  submittedAt: string
  review: { score: number; status: string; reviewedAt: string; reviewerName: string | null } | null
  correctedAt: string | null
}

interface VersionHistoryProps {
  versions: HistoryVersion[]
  /** Marks the version on screen (the trainer's current submission). */
  currentId?: string
  onSelect?: (id: string) => void
}

/** Every submitted version, newest first. Nothing is ever overwritten (brief §6). */
export function VersionHistory({ versions, currentId, onSelect }: VersionHistoryProps) {
  const reduce = useReducedMotion()
  return (
    <ol className="relative grid gap-5 ps-6 before:absolute before:inset-y-2 before:start-[7px] before:w-px before:bg-border">
      {versions.map((v, i) => {
        const status = SUBMISSION_STATUS[v.status]
        return (
          <motion.li
            key={v.id}
            initial={reduce ? false : { opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.08, ease: easeOut }}
            className="relative grid gap-2"
          >
            <span
              aria-hidden
              className={cn(
                'absolute -start-6 top-1 size-[15px] rounded-full border-2 border-white shadow-xs',
                i === 0 ? 'bg-teal' : 'bg-teal-soft',
              )}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className={cn('font-medium text-ink', v.id === currentId && 'text-teal-deep')}>
                Version {v.version}
                {v.id === currentId ? <span className="sr-only"> (shown)</span> : null}
              </h3>
              <StatusPill label={status.label} tone={status.tone} />
            </div>
            <p className="text-xs text-muted-foreground">Submitted {qatarTime(v.submittedAt)}</p>
            {v.file ? <FileChip submissionId={v.id} file={v.file} /> : null}
            {v.responseText ? (
              <details className="group rounded-lg border bg-white px-3 py-2 text-sm">
                <summary className="cursor-pointer list-none text-teal-deep marker:hidden">
                  <span className="group-open:hidden">Show response</span>
                  <span className="hidden group-open:inline">Hide response</span>
                  <span className="text-muted-foreground"> ({v.wordCount ?? 0} words)</span>
                </summary>
                <p className="mt-2 whitespace-pre-line text-ink">{v.responseText}</p>
              </details>
            ) : null}
            {v.review ? (
              <p className="text-sm text-muted-foreground">
                Marked <span className="font-medium text-ink">{v.review.score}/100</span> by{' '}
                {v.review.reviewerName ?? 'the trainer'}, {qatarTime(v.review.reviewedAt)}
                {v.correctedAt ? '. Mark corrected later.' : ''}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Waiting for marking.</p>
            )}
            {onSelect && v.id !== currentId ? (
              <button
                type="button"
                onClick={() => onSelect(v.id)}
                className="w-fit text-sm font-medium text-teal hover:underline"
              >
                Open version {v.version}
              </button>
            ) : null}
          </motion.li>
        )
      })}
    </ol>
  )
}
