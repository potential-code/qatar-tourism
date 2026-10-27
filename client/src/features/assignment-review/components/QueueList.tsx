import { Link } from '@tanstack/react-router'
import { AlertTriangle, ChevronRight, FileText, Film, PenLine, Type } from 'lucide-react'
import { StatusPill } from '@/features/assignments/components/StatusPill'
import { SUBMISSION_STATUS, type SubmissionStatus } from '@/features/assignments/utils/status'
import { qatarDate, qatarDateTime } from '@/lib/format/qatar-time'
import type { QueueItem } from '../types'

const FORMAT = {
  text: { icon: Type, label: 'Written' },
  document: { icon: FileText, label: 'Document' },
  video: { icon: Film, label: 'Video' },
} as const

function Waiting({ item }: { item: QueueItem }) {
  if (item.status !== 'submitted' && item.status !== 'under_review') {
    return <span className="tabular-nums text-ink">{item.score ?? ''}/100</span>
  }
  return (
    <span
      className={
        item.overdue
          ? 'inline-flex items-center gap-1 font-medium text-warning'
          : 'text-muted-foreground'
      }
    >
      {item.overdue ? <AlertTriangle aria-hidden className="size-3.5" /> : null}
      {item.waitingDays === 0
        ? 'Today'
        : `${item.waitingDays} ${item.waitingDays === 1 ? 'day' : 'days'}`}
      {item.overdue ? ', overdue' : ''}
    </span>
  )
}

/** The queue as a table on wide screens and as cards on phones. */
export function QueueList({ items, scoreColumn }: { items: QueueItem[]; scoreColumn: boolean }) {
  return (
    <>
      <section
        aria-label="Submissions"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: scrollable region must be keyboard reachable
        tabIndex={0}
        className="hidden overflow-x-auto rounded-xl border bg-card shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none md:block"
      >
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b bg-sand-deep/50 text-start text-xs text-muted-foreground">
              <th scope="col" className="px-4 py-3 text-start font-medium">
                Learner
              </th>
              <th scope="col" className="px-4 py-3 text-start font-medium">
                Assignment
              </th>
              <th scope="col" className="px-4 py-3 text-start font-medium">
                Version
              </th>
              <th scope="col" className="px-4 py-3 text-start font-medium">
                Submitted
              </th>
              <th scope="col" className="px-4 py-3 text-start font-medium">
                {scoreColumn ? 'Mark' : 'Waiting'}
              </th>
              <th scope="col" className="px-4 py-3 text-start font-medium">
                Status
              </th>
              <th scope="col" className="px-4 py-3">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const status = SUBMISSION_STATUS[item.status as SubmissionStatus]
              const Format = FORMAT[item.format]
              return (
                <tr
                  key={item.id}
                  className="group border-b last:border-0 transition-colors hover:bg-teal-mist/30"
                >
                  <td className="px-4 py-3">
                    <span className="grid">
                      <span className="font-medium text-ink">{item.learner.displayName}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {item.learner.learnerCode}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="grid">
                      <span className="text-ink">{item.assignmentTitle}</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        Program {item.programmeCode}, <Format.icon aria-hidden className="size-3" />{' '}
                        {Format.label}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">v{item.version}</td>
                  <td className="px-4 py-3" title={qatarDateTime(item.submittedAt)}>
                    {qatarDate(item.submittedAt, { year: false })}
                  </td>
                  <td className="px-4 py-3">
                    <Waiting item={item} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex flex-wrap items-center gap-1">
                      <StatusPill label={status.label} tone={status.tone} />
                      {item.hasDraft ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <PenLine aria-hidden className="size-3" /> Draft saved
                        </span>
                      ) : null}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-end">
                    <Link
                      to="/trainer/assignments/$submissionId"
                      params={{ submissionId: item.id }}
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-teal transition-colors hover:bg-teal-mist focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      {item.status === 'submitted' || item.status === 'under_review'
                        ? 'Mark'
                        : 'View'}
                      <span className="sr-only">
                        {' '}
                        {item.learner.learnerCode} version {item.version}
                      </span>
                      <ChevronRight aria-hidden className="size-4 rtl:-scale-x-100" />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <ul className="grid gap-3 md:hidden">
        {items.map((item) => {
          const status = SUBMISSION_STATUS[item.status as SubmissionStatus]
          return (
            <li key={item.id}>
              <Link
                to="/trainer/assignments/$submissionId"
                params={{ submissionId: item.id }}
                className="grid gap-2 rounded-xl border bg-card p-4 shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="grid">
                    <span className="font-medium text-ink">{item.learner.displayName}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.learner.learnerCode}, Program {item.programmeCode}, v{item.version}
                    </span>
                  </span>
                  <StatusPill label={status.label} tone={status.tone} />
                </span>
                <span className="text-sm text-ink">{item.assignmentTitle}</span>
                <span className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {qatarDate(item.submittedAt, { year: false })}
                  </span>
                  <Waiting item={item} />
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </>
  )
}
