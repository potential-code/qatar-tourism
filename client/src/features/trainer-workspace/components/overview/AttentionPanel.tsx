import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileText,
  MessageSquareWarning,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { qatarDateShort } from '@/features/sessions/utils/qatar-time'
import type { OverviewData } from '../../types'

function Row({
  icon: Icon,
  title,
  detail,
  action,
}: {
  icon: typeof FileText
  title: ReactNode
  detail: ReactNode
  action: ReactNode
}) {
  return (
    <li className="flex gap-3 py-3 first:pt-0 last:pb-0">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-maroon-mist text-maroon-deep">
        <Icon aria-hidden className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="text-sm text-muted-foreground">{detail}</p>
        <div className="mt-1">{action}</div>
      </div>
    </li>
  )
}

const linkClass = 'inline-flex items-center gap-1 text-sm font-medium text-teal hover:underline'

/** What needs the trainer now: attendance, the marking queue and learners' change requests. */
export function AttentionPanel({ data }: { data: OverviewData }) {
  const items: ReactNode[] = []
  for (const s of data.needsMarking.slice(0, 3)) {
    items.push(
      <Row
        key={`att-${s.id}`}
        icon={ClipboardList}
        title={`${s.outstanding} attendance records outstanding`}
        detail={`${s.title}, ${qatarDateShort(s.startsAt)}`}
        action={
          <Link
            to="/trainer/attendance/$sessionId"
            params={{ sessionId: s.id }}
            className={linkClass}
          >
            Record attendance <ArrowRight aria-hidden className="size-3.5 rtl:-scale-x-100" />
          </Link>
        }
      />,
    )
  }
  if (data.stats.markingQueue > 0) {
    items.push(
      <Row
        key="marking"
        icon={FileText}
        title={`${data.stats.markingQueue} assignments in your marking queue`}
        detail="Practical assignments assigned to you for rubric marking."
        action={
          <Link to={'/trainer/assignments' as never} className={linkClass}>
            Open marking queue <ArrowRight aria-hidden className="size-3.5 rtl:-scale-x-100" />
          </Link>
        }
      />,
    )
  }
  for (const r of data.requests) {
    items.push(
      <Row
        key={r.id}
        icon={MessageSquareWarning}
        title={`${r.learnerCode} asked to ${r.kind === 'cancel' ? 'cancel' : 'reschedule'} inside 24 hours`}
        detail={`${r.sessionTitle}. Reason: ${r.reason ?? 'not given'}. Sent for admin review.`}
        action={null}
      />,
    )
  }

  return (
    <section
      className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-xs md:p-6"
      aria-labelledby="attention-heading"
    >
      <h2 id="attention-heading" className="font-display text-2xl font-light text-ink">
        Needs your attention
      </h2>
      {items.length === 0 ? (
        <p className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-3 text-sm text-success">
          <CheckCircle2 aria-hidden className="size-4" /> All caught up. No attendance, marking or
          change requests are waiting.
        </p>
      ) : (
        <ul className="divide-y">{items}</ul>
      )}
      <p className="text-xs text-muted-foreground">
        Reschedule requests: {data.stats.rescheduleRequests}. Late changes are reviewed by the
        Academy administrator.
      </p>
    </section>
  )
}
